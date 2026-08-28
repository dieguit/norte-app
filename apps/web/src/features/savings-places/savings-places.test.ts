import { describe, expect, it } from 'vitest'
import {
  calculateSavingsPlacesWorkspace,
  getSavingsPlaceEntries,
  normalizeSavingsPlaceName,
} from './savings-places'

describe('normalizeSavingsPlaceName', () => {
  it('trims and lowercases with es-AR locale', () => {
    expect(normalizeSavingsPlaceName('  Banco Nación  ')).toBe('banco nación')
  })
})

describe('getSavingsPlaceEntries', () => {
  it('includes direct contributions and incoming transfers only', () => {
    const movements = [
      {
        kind: 'contribution' as const,
        id: 'direct',
        placeId: 'p1',
        placeName: 'Banco',
        amount: '100.00',
        currency: 'ARS' as const,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        kind: 'transfer' as const,
        id: 'incoming',
        fromPlaceId: 'p2',
        fromPlaceName: 'Caja',
        toPlaceId: 'p1',
        toPlaceName: 'Banco',
        amount: '50.00',
        currency: 'ARS' as const,
        createdAt: '2026-01-02T00:00:00.000Z',
      },
      {
        kind: 'transfer' as const,
        id: 'outgoing',
        fromPlaceId: 'p1',
        fromPlaceName: 'Banco',
        toPlaceId: 'p2',
        toPlaceName: 'Caja',
        amount: '25.00',
        currency: 'ARS' as const,
        createdAt: '2026-01-03T00:00:00.000Z',
      },
      {
        kind: 'contribution' as const,
        id: 'other-place',
        placeId: 'p2',
        placeName: 'Caja',
        amount: '75.00',
        currency: 'ARS' as const,
        createdAt: '2026-01-04T00:00:00.000Z',
      },
    ]

    expect(getSavingsPlaceEntries(movements, 'p1').map((movement) => movement.id)).toEqual([
      'incoming',
      'direct',
    ])
  })

  it('returns only the newest 20 matching entries', () => {
    const movements = Array.from({ length: 21 }, (_, i) => ({
      kind: 'contribution' as const,
      id: `direct-${i}`,
      placeId: 'p1',
      placeName: 'Banco',
      amount: '100.00',
      currency: 'ARS' as const,
      createdAt: new Date(2026, 0, i + 1).toISOString(),
    }))

    const entries = getSavingsPlaceEntries(movements, 'p1')

    expect(entries).toHaveLength(20)
    expect(entries[0].id).toBe('direct-20')
    expect(entries.some((entry) => entry.id === 'direct-0')).toBe(false)
  })
})

describe('calculateSavingsPlacesWorkspace', () => {
  const placeA = { id: 'p1', name: 'Banco' }
  const placeB = { id: 'p2', name: 'Caja' }

  it('calculates ARS and USD balances from contributions and transfers', () => {
    const result = calculateSavingsPlacesWorkspace({
      places: [placeA, placeB],
      contributions: [
        { id: 'c1', placeId: 'p1', amount: '1000.00', currency: 'ARS', createdAt: new Date('2026-01-01') },
        { id: 'c2', placeId: 'p1', amount: '200.00', currency: 'USD', createdAt: new Date('2026-01-02') },
        { id: 'c3', placeId: 'p2', amount: '500.00', currency: 'ARS', createdAt: new Date('2026-01-03') },
      ],
      transfers: [
        {
          id: 't1',
          fromPlaceId: 'p1',
          toPlaceId: 'p2',
          amount: '250.00',
          currency: 'ARS',
          createdAt: new Date('2026-01-04'),
          fromPlaceName: 'Banco',
          toPlaceName: 'Caja',
        },
      ],
    })

    const banco = result.places.find((p) => p.id === 'p1')!
    const caja = result.places.find((p) => p.id === 'p2')!

    expect(banco.balances.ARS).toBe('750.00')
    expect(banco.balances.USD).toBe('200.00')
    expect(caja.balances.ARS).toBe('750.00')
    expect(caja.balances.USD).toBe('0.00')
  })

  it('sorts places by name', () => {
    const result = calculateSavingsPlacesWorkspace({
      places: [placeA, placeB],
      contributions: [],
      transfers: [],
    })

    expect(result.places[0].name).toBe('Banco')
    expect(result.places[1].name).toBe('Caja')
  })

  it('sorts all workspace movements newest-first', () => {
    const contributions = Array.from({ length: 25 }, (_, i) => ({
      id: `c${i}`,
      placeId: 'p1',
      amount: '100.00',
      currency: 'ARS' as const,
      createdAt: new Date(2026, 0, i + 1),
    }))

    const result = calculateSavingsPlacesWorkspace({
      places: [placeA],
      contributions,
      transfers: [],
    })

    expect(result.movements).toHaveLength(25)
    expect(result.movements[0].createdAt > result.movements[24].createdAt).toBe(true)
  })

  it('marks places with hasMovements correctly', () => {
    const result = calculateSavingsPlacesWorkspace({
      places: [placeA, placeB],
      contributions: [{ id: 'c1', placeId: 'p1', amount: '100.00', currency: 'ARS', createdAt: new Date() }],
      transfers: [],
    })

    expect(result.places.find((p) => p.id === 'p1')!.hasMovements).toBe(true)
    expect(result.places.find((p) => p.id === 'p2')!.hasMovements).toBe(false)
  })
})
