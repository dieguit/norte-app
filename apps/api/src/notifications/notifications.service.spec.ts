import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../database/database.types';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  it('isolates per-candidate insert failures so other candidates are still claimed', async () => {
    const candidates = [
      { userId: 'u1', type: 'day_close_checkin', time: '21:00', jid: 'u1@lid' },
      { userId: 'u2', type: 'day_close_checkin', time: '21:00', jid: 'u2@lid' },
    ];
    let insertCount = 0;
    const db = {
      select: () => ({
        from: () => ({
          innerJoin: () => ({
            where: vi.fn().mockResolvedValue(candidates),
          }),
        }),
      }),
      insert: vi.fn().mockImplementation(() => ({
        values: () => ({
          onConflictDoNothing: () => ({
            returning: vi.fn().mockImplementation(() => {
              insertCount++;
              if (insertCount === 1) {
                return Promise.reject(new Error('db insert failed'));
              }
              return Promise.resolve([{ id: 'claim-2' }]);
            }),
          }),
        }),
      })),
    } as unknown as Database;

    const service = new NotificationsService(db);
    // 2026-10-22T00:00:00Z corresponds to 2026-10-21 21:00 in Argentina
    const claimed = await service.claimDue(new Date('2026-10-22T00:00:00Z'));

    expect(claimed).toEqual([
      {
        id: 'claim-2',
        userId: 'u2',
        type: 'day_close_checkin',
        jid: 'u2@lid',
      },
    ]);
  });
});
