// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Sheet } from '@/components/ui/sheet'
import { SidePanelContent, SidePanelHeader } from './SidePanel'

describe('SidePanel', () => {
  it('renders a right dialog with eyebrow, title, description and back', async () => {
    const onBack = vi.fn()
    render(
      <Sheet open>
        <SidePanelContent>
          <SidePanelHeader eyebrow="Colchón financiero" title="Editar objetivo" description="Detalle" onBack={onBack} />
        </SidePanelContent>
      </Sheet>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Editar objetivo' })
    expect(dialog).toHaveAttribute('data-side', 'right')
    expect(screen.getByText('Colchón financiero')).toBeDefined()
    await userEvent.click(screen.getByRole('button', { name: 'Volver' }))
    expect(onBack).toHaveBeenCalledOnce()
  })
})
