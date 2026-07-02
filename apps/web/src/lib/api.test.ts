import { afterEach, describe, expect, it, vi } from 'vitest'
import { listPlaceholderItems } from './api'

describe('web API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches and parses placeholder items', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: '6f0a7482-29a0-4c03-a3e1-256add2f91a8',
          title: 'TODO: fetched placeholder',
          description: 'TODO: replace with real data later',
          status: 'todo',
          createdAt: '2026-07-01T00:00:00.000Z',
          updatedAt: '2026-07-01T00:00:00.000Z',
        },
      ],
    })
    vi.stubGlobal('fetch', fetchMock)

    const items = await listPlaceholderItems()

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/placeholder')
    expect(items[0]?.title).toBe('TODO: fetched placeholder')
  })
})
