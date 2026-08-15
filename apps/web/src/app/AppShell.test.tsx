// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'
import { FinancialOnboarding } from './FinancialOnboarding'
import { Home } from './Home'

vi.mock('@clerk/tanstack-react-start', () => ({
  UserButton: () => <button type="button">Cuenta</button>,
}))

afterEach(cleanup)

describe('AppShell', () => {
  it('keeps financial navigation visible while onboarding is required', () => {
    render(
      <AppShell>
        <FinancialOnboarding />
      </AppShell>,
    )

    expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Empecemos por tu situación financiera' })).toBeDefined()
  })

  it('renders Home inside the financial shell', () => {
    render(
      <AppShell>
        <Home />
      </AppShell>,
    )

    expect(screen.getByRole('heading', { name: 'Tu plan financiero' })).toBeDefined()
  })

  it('renders Clerk account controls, including logout', () => {
    render(<AppShell><Home /></AppShell>)

    expect(screen.getByRole('button', { name: 'Cuenta' })).toBeDefined()
  })
})
