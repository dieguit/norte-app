import { z } from 'zod'

const deviceIdSchema = z.uuid()

export function getInvitedDeviceId(value: string | null | undefined): string | null {
  const result = deviceIdSchema.safeParse(value)
  return result.success ? result.data : null
}
