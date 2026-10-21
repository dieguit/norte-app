import { describe, expect, it, vi } from 'vitest';
import { MastraLifecycle, stripClientRequestContext } from './mastra.module';
import type { ChatChannel } from '../whatsapp/whatsapp.adapter.provider';

function fakes(channelKey: ChatChannel['key'] = 'whatsapp') {
  const initialize = vi.fn().mockResolvedValue(undefined);
  const mastra = {
    getAgent: vi.fn().mockReturnValue({ getChannels: () => ({ initialize }) }),
    shutdown: vi.fn().mockResolvedValue(undefined),
  };
  const adapter = {
    openDM: vi.fn().mockResolvedValue('thread-1'),
    postMessage: vi.fn().mockResolvedValue({}),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
  };
  const channel: ChatChannel = {
    key: channelKey,
    adapter,
  };
  return { initialize, mastra, adapter, channel };
}

describe('MastraLifecycle', () => {
  it('connects channel only after channels initialize', async () => {
    const { initialize, mastra, adapter, channel } = fakes();
    const order: string[] = [];
    initialize.mockImplementation(() => Promise.resolve(order.push('init')));
    adapter.connect.mockImplementation(() =>
      Promise.resolve(order.push('connect')),
    );
    await new MastraLifecycle(
      mastra as never,
      channel,
    ).onApplicationBootstrap();
    expect(mastra.getAgent).toHaveBeenCalledWith('norteAgent');
    expect(initialize).toHaveBeenCalledWith(mastra);
    expect(order).toEqual(['init', 'connect']);
  });

  it('starts polling channels without explicit connect', async () => {
    const { initialize, mastra } = fakes('telegram');
    const channel: ChatChannel = {
      key: 'telegram',
      adapter: {
        openDM: vi.fn().mockResolvedValue('thread-1'),
        postMessage: vi.fn().mockResolvedValue({}),
        disconnect: vi.fn().mockResolvedValue(undefined),
      },
    };
    await expect(
      new MastraLifecycle(mastra as never, channel).onApplicationBootstrap(),
    ).resolves.toBeUndefined();
    expect(mastra.getAgent).toHaveBeenCalledWith('norteAgent');
    expect(initialize).toHaveBeenCalledWith(mastra);
  });

  it('does nothing without an adapter', async () => {
    const { mastra } = fakes();
    await new MastraLifecycle(mastra as never, null).onApplicationBootstrap();
    expect(mastra.getAgent).not.toHaveBeenCalled();
  });

  it('keeps the API up when connecting fails', async () => {
    const { mastra, adapter, channel } = fakes();
    adapter.connect.mockRejectedValue(new Error('boom'));
    await expect(
      new MastraLifecycle(mastra as never, channel).onApplicationBootstrap(),
    ).resolves.toBeUndefined();
  });

  it('disconnects channel before shutting Mastra down', async () => {
    const { mastra, adapter, channel } = fakes();
    const order: string[] = [];
    adapter.disconnect.mockImplementation(() =>
      Promise.resolve(order.push('disconnect')),
    );
    mastra.shutdown.mockImplementation(() =>
      Promise.resolve(order.push('shutdown')),
    );
    await new MastraLifecycle(mastra as never, channel).onApplicationShutdown();
    expect(order).toEqual(['disconnect', 'shutdown']);
  });
});

describe('stripClientRequestContext', () => {
  it('strips requestContext from body and query', () => {
    const req = {
      body: { data: {}, requestContext: { userId: 'victim' } },
      query: { requestContext: 'encoded', other: 'kept' },
    };
    const next = vi.fn();
    stripClientRequestContext(req as never, {} as never, next);
    expect(req.body).toEqual({ data: {} });
    expect(req.query).toEqual({ other: 'kept' });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('handles requests without body or query gracefully', () => {
    const req = {};
    const next = vi.fn();
    stripClientRequestContext(req as never, {} as never, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
