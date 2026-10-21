import { describe, expect, it, vi } from 'vitest';
import { MastraLifecycle } from './mastra.module';

function fakes() {
  const initialize = vi.fn().mockResolvedValue(undefined);
  const mastra = {
    getAgent: vi.fn().mockReturnValue({ getChannels: () => ({ initialize }) }),
    shutdown: vi.fn().mockResolvedValue(undefined),
  };
  const adapter = {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
  };
  return { initialize, mastra, adapter };
}

describe('MastraLifecycle', () => {
  it('connects WhatsApp only after channels initialize', async () => {
    const { initialize, mastra, adapter } = fakes();
    const order: string[] = [];
    initialize.mockImplementation(async () => order.push('init'));
    adapter.connect.mockImplementation(async () => order.push('connect'));
    await new MastraLifecycle(mastra as never, adapter as never).onApplicationBootstrap();
    expect(mastra.getAgent).toHaveBeenCalledWith('norteAgent');
    expect(initialize).toHaveBeenCalledWith(mastra);
    expect(order).toEqual(['init', 'connect']);
  });

  it('does nothing without an adapter', async () => {
    const { mastra } = fakes();
    await new MastraLifecycle(mastra as never, null).onApplicationBootstrap();
    expect(mastra.getAgent).not.toHaveBeenCalled();
  });

  it('keeps the API up when connecting fails', async () => {
    const { mastra, adapter } = fakes();
    adapter.connect.mockRejectedValue(new Error('boom'));
    await expect(
      new MastraLifecycle(mastra as never, adapter as never).onApplicationBootstrap(),
    ).resolves.toBeUndefined();
  });

  it('disconnects WhatsApp before shutting Mastra down', async () => {
    const { mastra, adapter } = fakes();
    const order: string[] = [];
    adapter.disconnect.mockImplementation(async () => order.push('disconnect'));
    mastra.shutdown.mockImplementation(async () => order.push('shutdown'));
    await new MastraLifecycle(mastra as never, adapter as never).onApplicationShutdown();
    expect(order).toEqual(['disconnect', 'shutdown']);
  });
});
