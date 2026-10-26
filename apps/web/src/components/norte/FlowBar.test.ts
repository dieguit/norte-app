import { describe, expect, it } from 'vitest'
import { getFlowSegments } from './FlowBar'

const ars = (amount: string) => ({ amount, currency: 'ARS' as const })
const flow = (income: string, expenses: string, balance: string, contribution: string) =>
  getFlowSegments({ income: ars(income), expenses: ars(expenses), balance: ars(balance), contribution: ars(contribution) })

describe('getFlowSegments', () => {
  it('splits income into expenses, goals and what is left', () => {
    const segments = flow('850000.00', '612400.00', '237600.00', '213840.00')
    expect(segments.map((s) => s.key)).toEqual(['expenses', 'goals', 'free'])
    expect(segments.map((s) => Number(s.share.toFixed(4)))).toEqual([0.7205, 0.2516, 0.028])
  })

  it('drops the goals segment when nothing is dedicated', () => {
    expect(flow('100.00', '40.00', '60.00', '0.00')).toEqual([
      { key: 'expenses', share: 0.4 },
      { key: 'free', share: 0.6 },
    ])
  })

  it('fills the bar with expenses when the balance is exactly zero', () => {
    expect(flow('100.00', '100.00', '0.00', '0.00')).toEqual([{ key: 'expenses', share: 1 }])
  })

  it('uses expenses as the base and overflows in red when overspent', () => {
    expect(flow('100000.00', '125000.00', '-25000.00', '0.00')).toEqual([
      { key: 'expenses', share: 0.8 },
      { key: 'over', share: 0.2 },
    ])
  })

  it('is fully overspent when there is no income', () => {
    expect(flow('0.00', '5000.00', '-5000.00', '0.00')).toEqual([{ key: 'over', share: 1 }])
  })

  it('is empty for a month without movements', () => {
    expect(flow('0.00', '0.00', '0.00', '0.00')).toEqual([])
  })
})
