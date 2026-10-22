// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { overwriteGetLocale } from '#/paraglide/runtime'
import { SiteShell } from './SiteShell'

afterEach(cleanup)

describe('SiteShell', () => {
  it('links to the app and in-page sections in Spanish', () => {
    overwriteGetLocale(() => 'es')
    render(<SiteShell><p>Route content</p></SiteShell>)

    expect(screen.getByRole('link', { name: 'Norte' }).getAttribute('href')).toBe('/')
    expect(screen.getByRole('link', { name: 'Ir a la app' }).getAttribute('href')).toBe('/app')
    expect(screen.getByRole('link', { name: 'Funciones' }).getAttribute('href')).toBe('#features')
    expect(screen.getByRole('link', { name: 'Empezar' }).getAttribute('href')).toBe('#start')
    expect(screen.queryByText(/coming soon|próximamente/i)).toBeNull()
    expect(screen.getByText('Route content')).toBeDefined()
  })

  it('offers both languages with crawlable links', async () => {
    overwriteGetLocale(() => 'en')
    render(<SiteShell><p /></SiteShell>)

    expect(screen.getByRole('link', { name: 'Norte' }).getAttribute('href')).toBe('/en')
    await userEvent.click(screen.getByRole('button', { name: /Language/ }))
    expect(screen.getByRole('link', { name: 'Español' }).getAttribute('href')).toBe('/')
    const english = screen.getByRole('link', { name: 'English' })
    expect(english.getAttribute('href')).toBe('/en')
    expect(english.getAttribute('aria-current')).toBe('true')
  })
})
