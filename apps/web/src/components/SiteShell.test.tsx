// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SiteShell } from './SiteShell'

describe('SiteShell', () => {
  it('keeps landing-page navigation available in the shared footer', () => {
    render(<SiteShell><p>Route content</p></SiteShell>)

    expect(screen.getByRole('link', { name: 'Norte' }).getAttribute('href')).toBe('/')
    expect(screen.getByRole('link', { name: 'What it does' }).getAttribute('href')).toBe('/#what')
    expect(screen.getByRole('link', { name: 'Services' }).getAttribute('href')).toBe('/#services')
    expect(screen.getByRole('link', { name: 'Coming soon' }).getAttribute('href')).toBe('/#soon')
    expect(screen.getByText('Route content')).toBeDefined()
  })
})
