// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminPage } from './admin-page'
import { loginAdmin } from '../admin/auth'

vi.mock('../admin/auth', () => ({
  loginAdmin: vi.fn(),
  getAdminSession: vi.fn(),
}))

describe('AdminPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('submits the Spanish login form and reports invalid credentials', async () => {
    vi.mocked(loginAdmin).mockResolvedValue({ ok: false })

    render(<AdminPage authenticated={false} />)
    await userEvent.setup().type(screen.getByLabelText('Usuario'), 'admin')
    await userEvent.setup().type(screen.getByLabelText('Contraseña'), 'wrong')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('Usuario o contraseña incorrectos.')).toBeInTheDocument()
    expect(loginAdmin).toHaveBeenCalledWith({
      data: { username: 'admin', password: 'wrong' },
    })
  })

  it('generates a shareable Spanish invitation and switches to results', async () => {
    vi.stubGlobal('crypto', { randomUUID: () => '6f0a7482-29a0-4c03-a3e1-256add2f91a8' })
    vi.stubGlobal('location', { origin: 'http://localhost:3000' })

    render(<AdminPage authenticated />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Crear invitación' }))
    expect(screen.getByDisplayValue(/\/onboarding\?invitado=6f0a7482/)).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('tab', { name: 'Resultados' }))
    expect(screen.getByText('Próximamente vas a poder ver las respuestas de cada invitado.')).toBeInTheDocument()
  })
})
