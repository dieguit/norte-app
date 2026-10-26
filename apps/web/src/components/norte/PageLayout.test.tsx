// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Page, SplitLayout } from './PageLayout'

describe('Page/SplitLayout', () => {
  it('marks wide pages and renders both columns', () => {
    const { container } = render(<Page><SplitLayout aside={<p>left</p>}><p>right</p></SplitLayout></Page>)
    expect(container.firstElementChild).toHaveAttribute('data-wide')
    expect(container.firstElementChild).toHaveClass('pt-0', 'gap-3', 'xl:gap-9', 'xl:pt-10')
    expect(screen.getByText('left')).toBeDefined()
    expect(screen.getByText('right').parentElement).toHaveClass('xl:border-l')
  })
  it('omits data-wide for narrow pages', () => {
    const { container } = render(<Page wide={false}>x</Page>)
    expect(container.firstElementChild).not.toHaveAttribute('data-wide')
  })
})
