import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createRouter: vi.fn((options) => options),
}))

vi.mock('@tanstack/react-router', () => ({
  createRouter: mocks.createRouter,
}))

vi.mock('./routeTree.gen', () => ({ routeTree: {} }))

import { getRouter } from './router'

describe('router scroll restoration', () => {
  beforeEach(() => {
    mocks.createRouter.mockClear()
  })

  it('restores and resets the app content scroller', () => {
    getRouter()

    expect(mocks.createRouter).toHaveBeenCalledWith(
      expect.objectContaining({
        scrollRestoration: true,
        scrollToTopSelectors: ['#app-scroll-area'],
      }),
    )
  })
})
