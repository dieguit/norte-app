import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { afterAll, describe, expect, it } from 'vitest';
import { schema } from '../src/database/schema';
import { WhatsappLinksService } from '../src/whatsapp/whatsapp-links.service';
import { whatsappLinkTokens } from '../src/whatsapp/whatsapp.schema';

const databaseUrl = process.env.DATABASE_URL;
const safe =
  databaseUrl &&
  new URL(databaseUrl).pathname.replace(/^\//, '') === 'norte_test';
if (databaseUrl && !safe)
  throw new Error('WhatsApp links test only permits norte_test');
const describeWhenSafe = safe ? describe : describe.skip;

describeWhenSafe('WhatsappLinksService', () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });
  const links = new WhatsappLinksService(db);
  const jid = () => `${randomUUID()}@lid`;
  const user = () => `user_${randomUUID()}`;

  afterAll(async () => pool.end());

  it('returns null for an unknown JID', async () => {
    await expect(links.findUserByJid(jid())).resolves.toBeNull();
  });

  it('issues a 43-char token and reuses it while live', async () => {
    const sender = jid();
    const first = await links.issueToken(sender);
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    await expect(links.issueToken(sender)).resolves.toBe(first);
  });

  it('issues a new token once the previous one expired', async () => {
    const sender = jid();
    const first = await links.issueToken(sender);
    await db
      .update(whatsappLinkTokens)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(whatsappLinkTokens.token, first));
    const second = await links.issueToken(sender);
    expect(second).not.toBe(first);
    await expect(links.claim(second, user())).resolves.toEqual({
      jid: sender,
      alreadyClaimed: false,
    });
  });

  it('claims a token, links the JID and consumes the token', async () => {
    const sender = jid();
    const owner = user();
    const token = await links.issueToken(sender);
    await expect(links.claim(token, owner)).resolves.toEqual({
      jid: sender,
      alreadyClaimed: false,
    });
    await expect(links.findUserByJid(sender)).resolves.toBe(owner);
    await expect(links.claim(token, owner)).resolves.toEqual({
      jid: sender,
      alreadyClaimed: true,
    });
    await expect(links.claim(token, user())).rejects.toBeInstanceOf(
      GoneException,
    );
  });

  it('rejects unknown and expired tokens', async () => {
    await expect(links.claim('x'.repeat(43), user())).rejects.toBeInstanceOf(
      NotFoundException,
    );
    const token = await links.issueToken(jid());
    await db
      .update(whatsappLinkTokens)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(whatsappLinkTokens.token, token));
    await expect(links.claim(token, user())).rejects.toBeInstanceOf(
      GoneException,
    );
  });

  it('rejects a user already linked to another number without consuming the token', async () => {
    const owner = user();
    await links.claim(await links.issueToken(jid()), owner);
    const otherJid = jid();
    const token = await links.issueToken(otherJid);
    await expect(links.claim(token, owner)).rejects.toBeInstanceOf(
      ConflictException,
    );
    const [row] = await db
      .select()
      .from(whatsappLinkTokens)
      .where(eq(whatsappLinkTokens.token, token));
    expect(row.usedAt).toBeNull();
    await expect(links.findUserByJid(otherJid)).resolves.toBeNull();
  });

  it('allows re-claiming the same number by the same user', async () => {
    const sender = jid();
    const owner = user();
    await links.claim(await links.issueToken(sender), owner);
    await expect(
      links.claim(await links.issueToken(sender), owner),
    ).resolves.toEqual({ jid: sender, alreadyClaimed: false });
  });

  it('rejects claiming a number already linked to another account without consuming the token', async () => {
    const sender = jid();
    const ownerA = user();
    await links.claim(await links.issueToken(sender), ownerA);
    const tokenB = await links.issueToken(sender);
    const ownerB = user();
    await expect(links.claim(tokenB, ownerB)).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(links.findUserByJid(sender)).resolves.toBe(ownerA);
    const [row] = await db
      .select()
      .from(whatsappLinkTokens)
      .where(eq(whatsappLinkTokens.token, tokenB));
    expect(row?.usedAt).toBeNull();
  });

  it('handles concurrent claims by the same user with ConflictException on race', async () => {
    const owner = user();
    const t1 = await links.issueToken(jid());
    const t2 = await links.issueToken(jid());
    const results = await Promise.allSettled([
      links.claim(t1, owner),
      links.claim(t2, owner),
    ]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(ConflictException);
  });

  it('serializes concurrent token issuance for the same JID', async () => {
    const sender = jid();
    const tokens = await Promise.all(
      Array.from({ length: 5 }, () => links.issueToken(sender)),
    );
    expect(new Set(tokens).size).toBe(1);
  });
});
