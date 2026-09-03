// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SheetLoadingState, useSheetLoader } from './SheetLoadingState'

describe('SheetLoadingState', () => {
  it('exposes the loading state without changing the sheet layout', () => {
    const { container } = render(<SheetLoadingState />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Cargando...')).toHaveClass('sr-only')
    expect(container.querySelectorAll('[class*="animate-pulse"]')).toHaveLength(4)
  })

  it('loads sheet data and retries the request', async () => {
    const load = vi.fn()
      .mockResolvedValueOnce('first result')
      .mockResolvedValueOnce('second result')
    const { result } = renderHook(() => useSheetLoader({ open: true, load }))

    await waitFor(() => expect(result.current.data).toBe('first result'))
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.data).toBe('second result'))
    expect(load).toHaveBeenCalledTimes(2)
  })
})
