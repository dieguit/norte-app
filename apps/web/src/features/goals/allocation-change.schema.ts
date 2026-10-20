import { z } from 'zod'
import {
  AllocationChangeDraftWireSchema,
  ConfirmAllocationChangeWireSchema,
  type AllocationChangeDraftWire,
} from '@repo/shared-types'

export const allocationChangeDraftSchema = AllocationChangeDraftWireSchema
export const confirmAllocationChangeSchema = ConfirmAllocationChangeWireSchema

export type AllocationChangeDraft = AllocationChangeDraftWire
export type ConfirmAllocationChangeInput = z.infer<typeof confirmAllocationChangeSchema>
