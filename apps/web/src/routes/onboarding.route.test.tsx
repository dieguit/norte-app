import { describe, expect, it } from 'vitest'
import { Route as rootRoute } from './__root'
import { Route } from './onboarding'
import { OnboardingPage } from './onboarding/-components/onboarding-page'

describe('Onboarding route', () => {
  it('registers its path, metadata, and page component', () => {
    const registeredRoute = Route.update({
      id: '/onboarding',
      path: '/onboarding',
      getParentRoute: () => rootRoute,
    } as any)
    expect(registeredRoute.options).toMatchObject({ id: '/onboarding', path: '/onboarding' })
    expect(registeredRoute.options.head?.(undefined as never)).toEqual({ meta: [{ title: 'Onboarding | Norte' }] })
    expect(registeredRoute.options.component).toBe(OnboardingPage)
  })
})
