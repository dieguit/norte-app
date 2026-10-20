import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auth } from '@clerk/tanstack-react-start/server'
import { completeFinancialOnboardingServer } from './financial.server'

vi.mock('@clerk/tanstack-react-start/server', () => ({
  auth: vi.fn(),
}))

vi.mock('./auth.server', () => ({
  requireFinancialUser: vi.fn(),
}))

const input = {
  goal: {
    type: 'emergency_fund' as const,
    name: 'Fondo de emergencia',
    targetAmount: '0',
    currency: 'USD' as const,
    desiredMonth: '',
    priority: 'high' as const,
    strategy: 'save' as const,
    annualReturnRate: '0',
    availability: 'available_now' as const,
    availableFromMonth: '',
    allocations: [],
  },
  incomes: [
    {
      source: { kind: 'salary' as const },
      concept: 'Sueldo principal',
      amount: '500000.00',
      currency: 'ARS' as const,
      recurring: true,
      effectiveMonth: '2026-08',
    },
  ],
  expenses: [
    {
      source: { kind: 'housing' as const },
      concept: 'Alquiler',
      amount: '250000.00',
      currency: 'ARS' as const,
      recurring: true,
    },
  ],
}

describe('completeFinancialOnboardingServer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
    vi.mocked(auth).mockResolvedValue({
      getToken: vi.fn().mockResolvedValue('session-token'),
    } as never)
  })

  it('proxies the onboarding submission to the API with the session token', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ created: true }), { status: 201 }),
    )

    await expect(completeFinancialOnboardingServer(input)).resolves.toEqual({
      created: true,
    })

    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toMatch(/\/me\/financial-onboarding$/)
    expect(init).toMatchObject({ method: 'POST', cache: 'no-store' })
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer session-token')
    expect(JSON.parse(String(init?.body))).toEqual(input)
  })

  it('surfaces the API validation message when the submission is rejected', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Agregá al menos un gasto recurrente.' }), {
        status: 400,
      }),
    )

    await expect(completeFinancialOnboardingServer(input)).rejects.toThrow(
      'Agregá al menos un gasto recurrente.',
    )
  })
})
