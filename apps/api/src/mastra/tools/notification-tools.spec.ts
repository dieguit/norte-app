import { RequestContext } from '@mastra/core/request-context';
import { describe, expect, it, vi } from 'vitest';
import { createNotificationTools } from './notification-tools';

function ctx(userId?: string) {
  const requestContext = new RequestContext();
  if (userId) requestContext.set('userId', userId);
  return { requestContext } as never;
}

function setup() {
  const services = {
    notifications: {
      listSettings: vi.fn().mockResolvedValue([{ type: 'day_close_checkin' }]),
      updateSetting: vi
        .fn()
        .mockResolvedValue({ type: 'day_close_checkin', enabled: true }),
    },
    finances: {
      getDailySummary: vi.fn().mockResolvedValue({ day: '2026-10-21' }),
    },
  };
  return { services, tools: createNotificationTools(services as never) };
}

describe('notification tools', () => {
  it('reads settings for the context user', async () => {
    const { services, tools } = setup();
    await expect(
      tools.getNotificationSettings.execute!({}, ctx('u1')),
    ).resolves.toEqual([{ type: 'day_close_checkin' }]);
    expect(services.notifications.listSettings).toHaveBeenCalledWith('u1');
  });

  it('updates a setting for the context user', async () => {
    const { services, tools } = setup();
    await tools.updateNotificationSetting.execute!(
      { type: 'day_close_checkin', enabled: true, time: '22:30' } as never,
      ctx('u1'),
    );
    expect(services.notifications.updateSetting).toHaveBeenCalledWith(
      'u1',
      'day_close_checkin',
      { enabled: true, time: '22:30' },
    );
  });

  it('returns the daily summary for the context user', async () => {
    const { services, tools } = setup();
    await expect(
      tools.getDailySummary.execute!({}, ctx('u1')),
    ).resolves.toEqual({ day: '2026-10-21' });
    expect(services.finances.getDailySummary).toHaveBeenCalledWith('u1');
  });

  it('refuses without a user in context', async () => {
    const { services, tools } = setup();
    const result = await tools.getNotificationSettings.execute!({}, ctx());
    expect(result).toHaveProperty('error');
    expect(services.notifications.listSettings).not.toHaveBeenCalled();
  });
});
