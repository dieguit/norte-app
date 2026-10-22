import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getLocale, overwriteGetLocale } from './paraglide/runtime'

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

  it('delocalizes incoming URLs and localizes outgoing ones', () => {
    getRouter()
    const { rewrite } = mocks.createRouter.mock.calls[0][0]

    expect(rewrite.input({ url: new URL('https://somosnorte.lat/en') }).pathname).toBe('/')
    expect(rewrite.output({ url: new URL('https://somosnorte.lat/app') }).pathname).toBe('/app')
  })

  it('pins client locale to the server-rendered document language', () => {
    const originalDocument = globalThis.document
    const initialLocale = getLocale()
    try {
      globalThis.document = { documentElement: { lang: 'en' } } as unknown as Document
      getRouter()
      expect(getLocale()).toBe('en')
    } finally {
      globalThis.document = originalDocument
      overwriteGetLocale(() => initialLocale)
    }
  })
})
