// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  toaster: vi.fn(() => null),
  rootOptions: undefined as
    | undefined
    | {
        head: () => { meta: Array<Record<string, string>> }
        shellComponent: React.ComponentType<{ children: React.ReactNode }>
      },
}))

vi.mock('@clerk/tanstack-react-start', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@clerk/localizations', () => ({ esES: {} }))

vi.mock('@tanstack/react-router', () => ({
  HeadContent: () => null,
  Scripts: () => null,
  createRootRoute: (options: NonNullable<typeof mocks.rootOptions>) => {
    mocks.rootOptions = options
    return options
  },
}))

vi.mock('@tanstack/react-router-devtools', () => ({
  TanStackRouterDevtoolsPanel: () => null,
}))

vi.mock('@tanstack/react-devtools', () => ({
  TanStackDevtools: () => null,
}))

vi.mock('sonner', () => ({ Toaster: mocks.toaster }))

import './__root'

describe('root document configuration', () => {
  it('uses a two-second default duration', () => {
    const RootDocument = mocks.rootOptions!.shellComponent

    render(<RootDocument>Content</RootDocument>, { container: document.documentElement })

    expect(mocks.toaster).toHaveBeenCalledWith(
      expect.objectContaining({ duration: 2000 }),
      undefined,
    )
  })

  it('enables mobile safe-area insets', () => {
    expect(mocks.rootOptions!.head().meta).toContainEqual({
      name: 'viewport',
      content: 'width=device-width, initial-scale=1, viewport-fit=cover',
    })
  })
})
