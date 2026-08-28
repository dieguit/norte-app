import { describe, expect, it } from 'vitest'
import {
  createSavingsPlaceSchema,
  deleteSavingsPlaceSchema,
  renameSavingsPlaceSchema,
  savingsPlaceSelectionSchema,
  transferSavingsSchema,
} from './savings-places.schema'

const uuid1 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const uuid2 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'

describe('savingsPlaceSelectionSchema', () => {
  it('trims and validates new place names', () => {
    expect(savingsPlaceSelectionSchema.parse({ kind: 'new', name: '  Banco  ' })).toEqual({
      kind: 'new',
      name: 'Banco',
    })
  })

  it('rejects blank names for new places', () => {
    expect(() => savingsPlaceSelectionSchema.parse({ kind: 'new', name: '   ' })).toThrow()
  })

  it('accepts existing place selection with valid UUID', () => {
    expect(
      savingsPlaceSelectionSchema.parse({
        kind: 'existing',
        placeId: uuid1,
      }),
    ).toEqual({
      kind: 'existing',
      placeId: uuid1,
    })
  })

  it('rejects invalid UUID for existing place', () => {
    expect(() =>
      savingsPlaceSelectionSchema.parse({ kind: 'existing', placeId: 'not-a-uuid' }),
    ).toThrow()
  })
})

describe('transferSavingsSchema', () => {
  it('rejects transfers between the same place', () => {
    expect(() =>
      transferSavingsSchema.parse({
        fromPlaceId: uuid1,
        toPlaceId: uuid1,
        currency: 'ARS',
        amount: '10.00',
      }),
    ).toThrow('El origen y el destino deben ser distintos.')
  })

  it('accepts valid transfer between different places', () => {
    expect(
      transferSavingsSchema.parse({
        fromPlaceId: uuid1,
        toPlaceId: uuid2,
        currency: 'ARS',
        amount: '1.250,5',
      }),
    ).toEqual({
      fromPlaceId: uuid1,
      toPlaceId: uuid2,
      currency: 'ARS',
      amount: '1250.50',
    })
  })

  it.each(['invalid', '0', '0,00', '-1'])('rejects non-positive amount %s', (amount) => {
    expect(() =>
      transferSavingsSchema.parse({
        fromPlaceId: uuid1,
        toPlaceId: uuid2,
        currency: 'ARS',
        amount,
      }),
    ).toThrow('Ingresá un monto mayor a cero.')
  })
})

describe('createSavingsPlaceSchema', () => {
  it('trims place name', () => {
    expect(createSavingsPlaceSchema.parse({ name: '  Caja  ' })).toEqual({ name: 'Caja' })
  })

  it('rejects empty name', () => {
    expect(() => createSavingsPlaceSchema.parse({ name: '' })).toThrow()
  })
})

describe('renameSavingsPlaceSchema', () => {
  it('accepts valid rename input', () => {
    expect(
      renameSavingsPlaceSchema.parse({
        placeId: uuid1,
        name: 'Nuevo nombre',
      }),
    ).toEqual({
      placeId: uuid1,
      name: 'Nuevo nombre',
    })
  })
})

describe('deleteSavingsPlaceSchema', () => {
  it('accepts valid place ID', () => {
    expect(
      deleteSavingsPlaceSchema.parse({
        placeId: uuid1,
      }),
    ).toEqual({
      placeId: uuid1,
    })
  })
})
