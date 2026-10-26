// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import type { ComponentProps, ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HeaderAction, PageHeader } from './PageHeader'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode } & ComponentProps<'a'>) => <a href={to} {...props}>{children}</a>,
}))

describe('PageHeader', () => {
  it('names the heading with eyebrow and title', () => {
    render(<PageHeader eyebrow="Inicio" title="Mayo 2026" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Inicio · Mayo 2026' })).toBeDefined()
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('text-[24px]', 'xl:text-[36px]')
  })
  it('renders breadcrumb, back link and keeps heading as title', () => {
    render(<PageHeader title="Gastos" backTo="/app/finances" breadcrumb={[{ label: 'Finanzas', to: '/app/finances' }, { label: 'Gastos' }]} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Gastos' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/app/finances')
    expect(screen.getByRole('navigation', { name: 'Ruta' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Finanzas' })).toHaveAttribute('href', '/app/finances')
  })
  it('renders desktop-only action', () => {
    render(<PageHeader title="Gastos" action={<HeaderAction label="Agregar gasto" onClick={() => {}} />} />)
    expect(screen.getByRole('button', { name: 'Agregar gasto' })).toHaveClass('hidden', 'xl:inline-flex')
    expect(screen.getByRole('button', { name: 'Agregar gasto' }).parentElement).toHaveClass('hidden', 'xl:flex')
  })
  it('shows the action wrapper on mobile only when opted in', () => {
    render(<PageHeader title="Tus objetivos" showMobileAction action={<button>Nuevo objetivo</button>} />)
    const wrapper = screen.getByRole('button', { name: 'Nuevo objetivo' }).parentElement
    expect(wrapper).toHaveClass('flex')
    expect(wrapper).not.toHaveClass('hidden')
  })
})
