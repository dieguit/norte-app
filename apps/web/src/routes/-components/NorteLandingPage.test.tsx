// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { overwriteGetLocale } from '#/paraglide/runtime'
import { NorteLandingPage } from './NorteLandingPage'

afterEach(cleanup)

describe('NorteLandingPage', () => {
  it('renders the Spanish landing with a CTA to the app', () => {
    overwriteGetLocale(() => 'es')
    render(<NorteLandingPage />)

    expect(screen.getByRole('heading', { level: 1, name: 'Tu norte financiero, antes de decidir.' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Empezá gratis' }).getAttribute('href')).toBe('/app')
    expect(screen.getByRole('link', { name: 'Crear cuenta gratis' }).getAttribute('href')).toBe('/app')
    expect(screen.getByRole('heading', { level: 3, name: 'Asistente por WhatsApp' })).toBeDefined()
    expect(screen.getByRole('img', { name: 'Una mano sostiene una brújula sobre un camino abierto' }).getAttribute('src')).toBe('/images/compass.jpg')
    expect(screen.queryByText(/coming soon|próximamente/i)).toBeNull()
    expect(screen.getByRole('main').getAttribute('id')).toBe('main')
  })

  it('renders English when the locale is en', () => {
    overwriteGetLocale(() => 'en')
    render(<NorteLandingPage />)

    expect(screen.getByRole('heading', { level: 1, name: 'Your financial north, before you decide.' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Start free' }).getAttribute('href')).toBe('/app')
  })
})
