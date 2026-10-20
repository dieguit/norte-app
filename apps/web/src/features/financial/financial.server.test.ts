import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auth } from '@clerk/tanstack-react-start/server'
import {
  completeFinancialOnboardingServer,
  mutateFinancialApi,
} from './financial.server'

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

describe('mutateFinancialApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
    vi.mocked(auth).mockResolvedValue({
      getToken: vi.fn().mockResolvedValue('session-token'),
    } as never)
  })

  it('sends JSON body and custom method when body is provided', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )

    const response = await mutateFinancialApi('/test', 'POST', { name: 'Item' }, 'Error fallback')
    expect(response.ok).toBe(true)

    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toMatch(/\/test$/)
    expect(init).toMatchObject({ method: 'POST', cache: 'no-store' })
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
    expect(JSON.parse(String(init?.body))).toEqual({ name: 'Item' })
  })

  it('omits body and content-type when body is undefined', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))

    const response = await mutateFinancialApi('/test/1', 'DELETE', undefined, 'Error fallback')
    expect(response.status).toBe(204)

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(init).toMatchObject({ method: 'DELETE' })
    expect(init?.body).toBeUndefined()
    expect(new Headers(init?.headers).get('Content-Type')).toBeNull()
  })

  it('throws API error message when mutation fails with server error message', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Custom API error' }), { status: 400 }),
    )

    await expect(
      mutateFinancialApi('/test', 'POST', {}, 'Fallback error'),
    ).rejects.toThrow('Custom API error')
  })

  it('throws fallback message when mutation response is non-JSON or missing message', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('Internal Server Error', { status: 500 }),
    )

    await expect(
      mutateFinancialApi('/test', 'POST', {}, 'Fallback error'),
    ).rejects.toThrow('Fallback error')
  })
})
