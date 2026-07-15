// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OnboardingPage } from './onboarding'
import { getOnboardingDraft, saveOnboardingDraft } from '../onboarding/server'

vi.mock('../onboarding/server', () => ({
  getOnboardingDraft: vi.fn(),
  saveOnboardingDraft: vi.fn(),
}))

describe('OnboardingPage component tests', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.mocked(getOnboardingDraft).mockResolvedValue(undefined)
    vi.mocked(saveOnboardingDraft).mockResolvedValue({} as any)
  })

  afterEach(() => {
    cleanup()
  })

  it('renders all fields in the current step and blocks Next for a missing required field', async () => {
    const user = userEvent.setup()
    render(<OnboardingPage />)

    expect(screen.getByLabelText(/exact monthly income/i)).toBeDefined()
    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('Choose an income range.')).toBeDefined()
  })

  it('saves the completed step before moving forward', async () => {
    const user = userEvent.setup()
    render(<OnboardingPage />)

    await user.selectOptions(screen.getByLabelText(/income range/i), 'ARS 1,000,000-2,000,000')
    await user.click(screen.getByRole('button', { name: /next/i }))

    expect(saveOnboardingDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          answers: expect.objectContaining({
            incomeRange: 'ARS 1,000,000-2,000,000',
          }),
        }),
      }),
    )
  })

  it('asserts a rejected save displays a retry message and does not render the next step', async () => {
    const user = userEvent.setup()
    vi.mocked(saveOnboardingDraft).mockRejectedValueOnce(new Error('Network Error'))
    render(<OnboardingPage />)

    await user.selectOptions(screen.getByLabelText(/income range/i), 'ARS 1,000,000-2,000,000')
    await user.click(screen.getByRole('button', { name: /next/i }))

    // Displays retry/error message
    expect(await screen.findByText(/failed to save/i)).toBeDefined()
    // Does not render the next step
    expect(screen.queryByLabelText(/savings range/i)).toBeNull()
  })
})
