import '@tanstack/react-start/server-only'
import type { ProfileResponse } from '@repo/shared-types'
import { auth } from '@clerk/tanstack-react-start/server'
import { redirect } from '@tanstack/react-router'
import { requireFinancialUser } from './auth.server'
import type { CompleteFinancialOnboardingInput } from './financial.functions'
import {
  FinancesWorkspaceSchema,
  FinancialOnboardingResponseSchema,
  type FinancesWorkspace,
} from '@repo/shared-types'

export type FinancialAppState = ProfileResponse

export async function callFinancialApi(path: string, init: RequestInit = {}) {
  await requireFinancialUser()
  const token = await (await auth()).getToken()
  if (!token) throw redirect({ to: '/sign-in/$', params: { _splat: '' } })
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${process.env.API_BASE_URL ?? 'http://localhost:3001'}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  })
  if (response.status === 401)
    throw redirect({ to: '/sign-in/$', params: { _splat: '' } })
  return response
}

export async function mutateFinancialApi(
  path: string,
  method: string,
  body: unknown,
  failureMessage: string,
): Promise<Response> {
  const response = await callFinancialApi(path, {
    method,
    ...(body === undefined
      ? {}
      : {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.message ?? failureMessage)
  }
  return response
}

export async function throwFinancialApiError(response: Response, fallback: string): Promise<never> {
  const message = (await response.json().catch(() => null))?.message
  throw new Error(Array.isArray(message) ? message[0] : typeof message === 'string' ? message : fallback)
}

export type FinancesWorkspaceState = FinancesWorkspace

export async function getFinancialAppStateServer(): Promise<FinancialAppState> {
  const response = await callFinancialApi('/me/profile')
  if (!response.ok) throw new Error('No se pudo cargar el perfil financiero.')
  return response.json() as Promise<FinancialAppState>
}

export async function getFinancesWorkspaceServer(month?: string): Promise<FinancesWorkspaceState | null> {
  const query = month ? `?month=${encodeURIComponent(month)}` : ''
  const response = await callFinancialApi(`/finances${query}`)
  if (!response.ok) throw new Error('No se pudieron cargar las finanzas.')
  return FinancesWorkspaceSchema.nullable().parse(await response.json())
}

export async function completeFinancialOnboardingServer(
  input: CompleteFinancialOnboardingInput,
) {
  const response = await callFinancialApi('/me/financial-onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.message ?? 'No se pudo guardar el plan financiero.')
  }
  return FinancialOnboardingResponseSchema.parse(await response.json())
}
