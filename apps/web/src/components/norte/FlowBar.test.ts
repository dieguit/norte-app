import { describe, expect, it } from 'vitest'
import { getFlowSegments } from './FlowBar'

const ars = (amount: string) => ({ amount, currency: 'ARS' as const })
const flow = (balance: string, contribution: string) => getFlowSegments({ balance: ars(balance), contribution: ars(contribution) })

describe('getFlowSegments', () => {
  it('splits the balance into goals and what is left', () => {
    expect(flow('100.00', '80.00')).toEqual([
      { key: 'goals', share: 0.8 },
      { key: 'free', share: 0.2 },
    ])
  })

  it('drops the goals segment when nothing is dedicated', () => {
    expect(flow('60.00', '0.00')).toEqual([{ key: 'free', share: 1 }])
  })

  it('is fully red when overspent', () => {
    expect(flow('-25000.00', '0.00')).toEqual([{ key: 'over', share: 1 }])
  })

  it('is empty when the balance is zero', () => {
    expect(flow('0.00', '0.00')).toEqual([])
  })
})
