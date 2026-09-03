// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAdminResultFiles, listAdminResults } from '../admin.functions'
import {
  useAdminResultLoading,
  useAdminResultRowToggle,
} from './admin-results-hooks'

vi.mock('../admin.functions', () => ({
  getAdminResultFiles: vi.fn(),
  listAdminResults: vi.fn(),
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('admin result request coordination', () => {
  it('keeps the newest results request when an older one resolves later', async () => {
    const first = deferred<any[]>()
    const second = deferred<any[]>()
    vi.mocked(listAdminResults)
      .mockReturnValueOnce(first.promise as any)
      .mockReturnValueOnce(second.promise as any)

    const { result } = renderHook(() => useAdminResultLoading())
    await waitFor(() => expect(listAdminResults).toHaveBeenCalledTimes(1))

    act(() => {
      void result.current.fetchResults()
    })
    await waitFor(() => expect(listAdminResults).toHaveBeenCalledTimes(2))

    const newest = [{ deviceId: 'newest' }]
    await act(async () => {
      second.resolve(newest)
      await second.promise
    })
    await waitFor(() => expect(result.current.results).toEqual(newest))

    const stale = [{ deviceId: 'stale' }]
    await act(async () => {
      first.resolve(stale)
      await first.promise
    })
    expect(result.current.results).toEqual(newest)
  })

  it('cancels the visible file request when a row closes and ignores its stale result', async () => {
    const first = deferred<any[]>()
    const second = deferred<any[]>()
    vi.mocked(getAdminResultFiles)
      .mockReturnValueOnce(first.promise as any)
      .mockReturnValueOnce(second.promise as any)

    const { result } = renderHook(() => useAdminResultRowToggle())
    act(() => {
      void result.current.toggleRow('device-ana')
    })
    await waitFor(() => expect(getAdminResultFiles).toHaveBeenCalledTimes(1))

    act(() => {
      void result.current.toggleRow('device-ana')
    })
    act(() => {
      void result.current.toggleRow('device-ana')
    })
    await waitFor(() => expect(getAdminResultFiles).toHaveBeenCalledTimes(2))

    const newest = [{ fieldId: 'new', label: 'New', url: '/new' }]
    await act(async () => {
      second.resolve(newest)
      await second.promise
    })
    await waitFor(() => expect(result.current.filesByDevice['device-ana'].files).toEqual(newest))

    const stale = [{ fieldId: 'stale', label: 'Stale', url: '/stale' }]
    await act(async () => {
      first.resolve(stale)
      await first.promise
    })
    expect(result.current.filesByDevice['device-ana'].files).toEqual(newest)
  })
})
