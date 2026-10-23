import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { afterAll, describe, expect, it } from 'vitest';
import { schema } from '../src/database/schema';
import { notifications } from '../src/notifications/notifications.schema';
import { NotificationsService } from '../src/notifications/notifications.service';
import { whatsappLinks } from '../src/whatsapp/whatsapp.schema';

const databaseUrl = process.env.DATABASE_URL;
const safe =
  databaseUrl &&
  new URL(databaseUrl).pathname.replace(/^\//, '') === 'norte_test';
if (databaseUrl && !safe)
  throw new Error('Notifications test only permits norte_test');
const describeWhenSafe = safe ? describe : describe.skip;

describeWhenSafe('NotificationsService', () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });
  const service = new NotificationsService(db);
  const user = () => `user_${randomUUID()}`;

  afterAll(async () => pool.end());

  describe('settings', () => {
    it('returns disabled defaults when nothing is stored', async () => {
      await expect(service.listSettings(user())).resolves.toEqual([
        {
          type: 'day_close_checkin',
          enabled: false,
          frequency: 'daily',
          time: '21:00',
        },
        {
          type: 'savings_digest',
          enabled: false,
          frequency: 'daily',
          time: '09:00',
        },
      ]);
    });

    it('upserts and only changes the provided fields', async () => {
      const u = user();
      await expect(
        service.updateSetting(u, 'day_close_checkin', { enabled: true }),
      ).resolves.toMatchObject({ enabled: true, time: '21:00' });
      await expect(
        service.updateSetting(u, 'day_close_checkin', { time: '22:30' }),
      ).resolves.toMatchObject({ enabled: true, time: '22:30' });
      await expect(
        service.updateSetting(u, 'day_close_checkin', { enabled: false }),
      ).resolves.toMatchObject({ enabled: false, time: '22:30' });
      await expect(service.listSettings(u)).resolves.toEqual([
        {
          type: 'day_close_checkin',
          enabled: false,
          frequency: 'daily',
          time: '22:30',
        },
        {
          type: 'savings_digest',
          enabled: false,
          frequency: 'daily',
          time: '09:00',
        },
      ]);
    });

    it('rejects an empty patch', async () => {
      await expect(
        service.updateSetting(user(), 'day_close_checkin', {}),
      ).rejects.toThrow('Indicá si activar/desactivar o el horario.');
    });
  });

  describe('deliveries', () => {
    const at = (iso: string) => new Date(iso);
    const enabledLinkedUser = async (time = '21:00') => {
      const u = user();
      await db
        .insert(whatsappLinks)
        .values({ jid: `${randomUUID()}@lid`, userId: u });
      await service.updateSetting(u, 'day_close_checkin', {
        enabled: true,
        time,
      });
      return u;
    };
    const mine = <T extends { userId: string }>(u: string, rows: T[]) =>
      rows.filter((r) => r.userId === u);
    const rowsOf = (u: string) =>
      db.select().from(notifications).where(eq(notifications.userId, u));

    // 2026-10-21 21:00 BA = 2026-10-22T00:00Z
    const SLOT = '2026-10-22T00:00:00Z';

    it('claims the slot once and includes the jid', async () => {
      const u = await enabledLinkedUser();
      const first = mine(u, await service.claimDue(at(SLOT)));
      expect(first).toEqual([
        {
          id: expect.any(String) as unknown,
          userId: u,
          type: 'day_close_checkin',
          jid: expect.stringMatching(/@lid$/) as unknown,
        },
      ]);
      expect(
        mine(u, await service.claimDue(at('2026-10-22T00:30:00Z'))),
      ).toEqual([]);
      const [row] = await rowsOf(u);
      expect(row).toMatchObject({ period: '2026-10-21', status: 'open' });
      expect(row.scheduledAt.toISOString()).toBe('2026-10-22T00:00:00.000Z');
    });

    it('does not claim before the slot nor 2h or more after it', async () => {
      const u = await enabledLinkedUser();
      expect(
        mine(u, await service.claimDue(at('2026-10-21T23:30:00Z'))),
      ).toEqual([]);
      expect(
        mine(u, await service.claimDue(at('2026-10-22T02:00:00Z'))),
      ).toEqual([]);
      expect(
        mine(u, await service.claimDue(at('2026-10-22T01:30:00Z'))),
      ).toHaveLength(1);
    });

    it('skips disabled and unlinked users', async () => {
      const unlinked = user();
      await service.updateSetting(unlinked, 'day_close_checkin', {
        enabled: true,
      });
      const disabled = await enabledLinkedUser();
      await service.updateSetting(disabled, 'day_close_checkin', {
        enabled: false,
      });
      const claimed = await service.claimDue(at(SLOT));
      expect(mine(unlinked, claimed)).toEqual([]);
      expect(mine(disabled, claimed)).toEqual([]);
    });

    it('never sends twice in a day even if the time changes after sending', async () => {
      const u = await enabledLinkedUser('21:00');
      expect(mine(u, await service.claimDue(at(SLOT)))).toHaveLength(1);
      await service.updateSetting(u, 'day_close_checkin', { time: '22:00' });
      expect(
        mine(u, await service.claimDue(at('2026-10-22T01:00:00Z'))),
      ).toEqual([]);
    });

    it('catches up a 23:30 slot after midnight as the previous day', async () => {
      const u = await enabledLinkedUser('23:30');
      // 2026-10-22 00:30 BA
      const claimed = mine(
        u,
        await service.claimDue(at('2026-10-22T03:30:00Z')),
      );
      expect(claimed).toHaveLength(1);
      const [row] = await rowsOf(u);
      expect(row.period).toBe('2026-10-21');
    });

    it('closes sent deliveries after the 30 min window, exactly once', async () => {
      const u = await enabledLinkedUser();
      const [d] = mine(u, await service.claimDue(at(SLOT)));
      await service.markSent(d.id, at(SLOT));
      expect(
        mine(u, await service.closeExpired(at('2026-10-22T00:29:59Z'))),
      ).toEqual([]);
      expect(
        mine(u, await service.closeExpired(at('2026-10-22T00:30:00Z'))),
      ).toEqual([
        { id: d.id, userId: u, type: 'day_close_checkin', jid: d.jid },
      ]);
      expect(
        mine(u, await service.closeExpired(at('2026-10-22T01:00:00Z'))),
      ).toEqual([]);
      const [row] = await rowsOf(u);
      expect(row.status).toBe('closed');
    });

    it('closes never-sent deliveries silently', async () => {
      const u = await enabledLinkedUser();
      await service.claimDue(at(SLOT));
      expect(
        mine(u, await service.closeExpired(at('2026-10-22T00:30:00Z'))),
      ).toEqual([]);
      const [row] = await rowsOf(u);
      expect(row.status).toBe('closed');
    });

    it('markAnswered prevents the timeout and only touches open rows of that user', async () => {
      const u = await enabledLinkedUser();
      const other = await enabledLinkedUser();
      const claimed = await service.claimDue(at(SLOT));
      const [d] = mine(u, claimed);
      const [o] = mine(other, claimed);
      await service.markSent(d.id, at(SLOT));
      await service.markSent(o.id, at(SLOT));
      expect(await service.markAnswered(u)).toBe(true);
      const closed = await service.closeExpired(at('2026-10-22T00:30:00Z'));
      expect(mine(u, closed)).toEqual([]);
      expect(mine(other, closed)).toHaveLength(1);
      expect((await rowsOf(u))[0].status).toBe('answered');
      expect(await service.markAnswered(other)).toBe(false);
      expect((await rowsOf(other))[0].status).toBe('closed');
    });

    it('markClosed closes a delivery', async () => {
      const u = await enabledLinkedUser();
      const [d] = mine(u, await service.claimDue(at(SLOT)));
      await service.markClosed(d.id);
      const [row] = await db
        .select()
        .from(notifications)
        .where(and(eq(notifications.id, d.id), eq(notifications.userId, u)));
      expect(row.status).toBe('closed');
    });

    // 2026-10-22 09:00 BA = 2026-10-22T12:00Z
    const DIGEST_SLOT = '2026-10-22T12:00:00Z';
    const digestUser = async () => {
      const u = await enabledLinkedUser();
      await service.updateSetting(u, 'savings_digest', { enabled: true });
      return u;
    };

    it('claims digests as closed so they never time out or get answered', async () => {
      const u = await digestUser();
      const [d] = mine(u, await service.claimDue(at(DIGEST_SLOT)));
      expect(d.type).toBe('savings_digest');
      await service.markSent(d.id, at(DIGEST_SLOT));
      expect(await service.markAnswered(u)).toBe(false);
      expect(mine(u, await service.closeExpired(at('2026-10-22T13:00:00Z')))).toEqual([]);
      const [row] = await rowsOf(u);
      expect(row.status).toBe('closed');
    });

    it('a reply after both notifications answers only the check-in', async () => {
      const u = await digestUser();
      const [digest] = mine(u, await service.claimDue(at(DIGEST_SLOT)));
      await service.markSent(digest.id, at(DIGEST_SLOT));
      // check-in 2026-10-22 21:00 BA
      const [checkin] = mine(u, await service.claimDue(at('2026-10-23T00:00:00Z')));
      await service.markSent(checkin.id, at('2026-10-23T00:00:00Z'));
      expect(await service.markAnswered(u)).toBe(true);
      const rows = await rowsOf(u);
      expect(rows.find((r) => r.type === 'savings_digest')?.status).toBe('closed');
      expect(rows.find((r) => r.type === 'day_close_checkin')?.status).toBe('answered');
    });
  });
});
