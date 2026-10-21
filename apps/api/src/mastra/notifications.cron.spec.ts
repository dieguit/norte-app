import { describe, expect, it, vi } from 'vitest';
import { NOTIFICATION_DEFINITIONS } from '../notifications/notification-definitions';
import type { NotificationDelivery } from '../notifications/notifications.service';
import { NotificationsCron } from './notifications.cron';

const NOW = new Date('2026-10-22T00:00:00Z');
const delivery = (n: number) => ({
  id: `n${n}`,
  userId: `u${n}`,
  type: 'day_close_checkin' as const,
  jid: `jid${n}@lid`,
});
const { message, timeoutMessage } = NOTIFICATION_DEFINITIONS.day_close_checkin;

function setup({ withChannel = true } = {}) {
  const memory = {
    listThreads: vi.fn().mockResolvedValue({ threads: [{ id: 't1' }] }),
    saveMessages: vi.fn().mockResolvedValue({ messages: [] }),
  };
  const mastra = {
    getAgent: () => ({ getMemory: () => Promise.resolve(memory) }),
  };
  const adapter = {
    openDM: vi.fn((jid: string) => Promise.resolve(`dm:${jid}`)),
    postMessage: vi.fn().mockResolvedValue(undefined),
  };
  const calls: string[] = [];
  const notifications = {
    closeExpired: vi.fn(
      () => (
        calls.push('close'),
        Promise.resolve([] as NotificationDelivery[])
      ),
    ),
    claimDue: vi.fn(
      () => (
        calls.push('claim'),
        Promise.resolve([] as NotificationDelivery[])
      ),
    ),
    markSent: vi.fn().mockResolvedValue(undefined),
    markClosed: vi.fn().mockResolvedValue(undefined),
  };
  const cron = new NotificationsCron(
    mastra as never,
    withChannel ? ({ key: 'whatsapp', adapter } as never) : null,
    notifications as never,
  );
  return { cron, memory, adapter, notifications, calls };
}

describe('NotificationsCron', () => {
  it('does nothing without a chat channel', async () => {
    const { cron, notifications } = setup({ withChannel: false });
    await cron.run(NOW);
    expect(notifications.closeExpired).not.toHaveBeenCalled();
    expect(notifications.claimDue).not.toHaveBeenCalled();
  });

  it('closes expired before claiming due', async () => {
    const { cron, calls } = setup();
    await cron.run(NOW);
    expect(calls).toEqual(['close', 'claim']);
  });

  it('sends the check-in, marks it sent and stores it in memory as assistant', async () => {
    const { cron, adapter, notifications, memory } = setup();
    notifications.claimDue.mockResolvedValue([delivery(1)]);
    await cron.run(NOW);
    expect(adapter.postMessage).toHaveBeenCalledWith('dm:jid1@lid', message);
    expect(notifications.markSent).toHaveBeenCalledWith('n1', NOW);
    expect(memory.listThreads).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: {
          resourceId: 'user:u1',
          metadata: { channel_platform: 'whatsapp' },
        },
      }),
    );
    expect(memory.saveMessages).toHaveBeenCalledWith({
      messages: [
        expect.objectContaining({
          role: 'assistant',
          threadId: 't1',
          resourceId: 'user:u1',
          content: { format: 2, parts: [{ type: 'text', text: message }] },
        }),
      ],
    });
  });

  it('sends the timeout message for expired deliveries', async () => {
    const { cron, adapter, notifications } = setup();
    notifications.closeExpired.mockResolvedValue([delivery(2)]);
    await cron.run(NOW);
    expect(adapter.postMessage).toHaveBeenCalledWith(
      'dm:jid2@lid',
      timeoutMessage,
    );
  });

  it('closes a delivery whose send fails and keeps going', async () => {
    const { cron, adapter, notifications } = setup();
    notifications.claimDue.mockResolvedValue([delivery(1), delivery(2)]);
    adapter.postMessage.mockRejectedValueOnce(new Error('socket closed'));
    await cron.run(NOW);
    expect(notifications.markClosed).toHaveBeenCalledWith('n1');
    expect(notifications.markSent).not.toHaveBeenCalledWith('n1', NOW);
    expect(notifications.markSent).toHaveBeenCalledWith('n2', NOW);
  });

  it('continues claiming remaining deliveries when markClosed fails after send failure', async () => {
    const { cron, adapter, notifications } = setup();
    notifications.claimDue.mockResolvedValue([delivery(1), delivery(2)]);
    adapter.postMessage.mockRejectedValueOnce(new Error('socket closed'));
    notifications.markClosed.mockRejectedValueOnce(new Error('db error'));
    await cron.run(NOW);
    expect(notifications.markClosed).toHaveBeenCalledWith('n1');
    expect(notifications.markSent).not.toHaveBeenCalledWith('n1', NOW);
    expect(notifications.markSent).toHaveBeenCalledWith('n2', NOW);
  });

  it('treats memory failures as non-fatal', async () => {
    const { cron, notifications, memory } = setup();
    notifications.claimDue.mockResolvedValue([delivery(1)]);
    memory.saveMessages.mockRejectedValue(new Error('pg down'));
    await cron.run(NOW);
    expect(notifications.markSent).toHaveBeenCalledWith('n1', NOW);
    expect(notifications.markClosed).not.toHaveBeenCalled();
  });

  it('skips the memory write when the user has no channel thread', async () => {
    const { cron, notifications, memory } = setup();
    notifications.claimDue.mockResolvedValue([delivery(1)]);
    memory.listThreads.mockResolvedValue({ threads: [] });
    await cron.run(NOW);
    expect(memory.saveMessages).not.toHaveBeenCalled();
    expect(notifications.markSent).toHaveBeenCalledWith('n1', NOW);
  });
});
