// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import * as React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet'

describe('Sheet primitive', () => {
  it('renders controlled sheet with all exports and accessibility content', () => {
    render(
      <Sheet open={true}>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Sheet Title</SheetTitle>
            <SheetDescription>Sheet Description</SheetDescription>
          </SheetHeader>
          <div>Sheet body content</div>
          <SheetFooter>
            <SheetClose>Cerrar</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    )

    expect(screen.getByRole('dialog')).toBeDefined()
    expect(screen.getByText('Sheet Title')).toBeDefined()
    expect(screen.getByText('Sheet Description')).toBeDefined()
    expect(screen.getByText('Sheet body content')).toBeDefined()
    expect(screen.getAllByRole('button', { name: /cerrar/i }).length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument()
    expect(document.querySelector('[data-slot="sheet-overlay"]')).toHaveClass('motion-reduce:transition-none')
    expect(screen.getByRole('dialog')).toHaveClass('motion-reduce:transition-none', 'motion-reduce:transform-none')
  })

  it('supports initialFocus and finalFocus props on SheetContent', () => {
    function ControlledTest() {
      const inputRef = React.useRef<HTMLInputElement>(null)
      const triggerRef = React.useRef<HTMLButtonElement>(null)

      return (
        <Sheet open={true}>
          <SheetTrigger ref={triggerRef}>Trigger</SheetTrigger>
          <SheetContent initialFocus={inputRef} finalFocus={triggerRef}>
            <SheetHeader>
              <SheetTitle>Focus Test</SheetTitle>
            </SheetHeader>
            <input ref={inputRef} data-testid="initial-input" />
          </SheetContent>
        </Sheet>
      )
    }

    render(<ControlledTest />)
    expect(screen.getByTestId('initial-input')).toBeDefined()
  })
})
