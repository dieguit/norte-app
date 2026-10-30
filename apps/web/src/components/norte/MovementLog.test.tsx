// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MovementLog } from './MovementLog'

const item = (id: string, label: string) => ({ id, kind: 'expense' as const, label, category: 'Gasto · Ropa', amount: { amount: '-30000.00', currency: 'ARS' as const }, recurring: false })

describe('MovementLog', () => {
  it('renders day headings with Hoy badge and non-interactive rows', () => {
    render(<MovementLog today="2026-10-23" empty="Sin movimientos este mes" days={[{ day: '2026-10-23', items: [item('a', 'Cena')] }, { day: '2026-10-21', items: [item('b', 'Zapatillas')] }]} />)
    const today = screen.getByRole('heading', { name: /Viernes 23/ })
    expect(within(today.parentElement!).getByText('Hoy')).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Miércoles 21' })).toBeDefined()
    expect(screen.queryByRole('button')).toBeNull()
  })
  it('shows empty copy', () => {
    render(<MovementLog today="2026-10-23" empty="Sin movimientos este mes" days={[]} />)
    expect(screen.getByText('Sin movimientos este mes')).toBeDefined()
  })
})
