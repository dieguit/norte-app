import { createServerFn } from '@tanstack/react-start'
import {
  createSavingsPlaceSchema,
  deleteSavingsPlaceSchema,
  renameSavingsPlaceSchema,
  transferSavingsSchema,
} from './savings-places.schema'
import {
  createSavingsPlaceServer,
  deleteSavingsPlaceServer,
  renameSavingsPlaceServer,
  transferSavingsServer,
} from './savings-places.server'

export const createSavingsPlace = createServerFn({ method: 'POST' })
  .validator((input: unknown) => createSavingsPlaceSchema.parse(input))
  .handler(createSavingsPlaceServer)

export const renameSavingsPlace = createServerFn({ method: 'POST' })
  .validator((input: unknown) => renameSavingsPlaceSchema.parse(input))
  .handler(renameSavingsPlaceServer)

export const deleteSavingsPlace = createServerFn({ method: 'POST' })
  .validator((input: unknown) => deleteSavingsPlaceSchema.parse(input))
  .handler(deleteSavingsPlaceServer)

export const transferSavings = createServerFn({ method: 'POST' })
  .validator((input: unknown) => transferSavingsSchema.parse(input))
  .handler(transferSavingsServer)
