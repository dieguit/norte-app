// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { NorteLandingPage } from '../components/NorteLandingPage'

afterEach(cleanup)

describe('NorteLandingPage', () => {
  it('renders the Norte landing content and its in-page navigation', () => {
    render(<NorteLandingPage />)

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Your financial north, before the decision.',
      }),
    ).toBeDefined()
    expect(
      screen.getByRole('img', { name: 'A hand holding a compass over an open road' }).getAttribute('src'),
    ).toBe('/images/compass.jpg')
    expect(screen.getByText('Goal roadmap')).toBeDefined()
    expect(screen.getByText('Norte is not available yet. We are building the first version.')).toBeDefined()
    expect(screen.getByRole('main').getAttribute('id')).toBe('main')
  })
})
