import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from './client'
import { financialProfiles } from './schema'
import { withLockedFinancialProfile } from './with-locked-financial-profile.server'

vi.mock('./client', () => ({
  db: { transaction: vi.fn() },
}))

const profile = {
  userId: 'user-1',
  plannedMonthlyContribution: '60000.00',
}

function getSqlParamValues(query: any): string[] {
  const values: string[] = []
  const visit = (node: any) => {
    if (node?.constructor?.name === 'Param') {
      values.push(node.value)
      return
    }
    if (Array.isArray(node?.queryChunks)) node.queryChunks.forEach(visit)
  }
  visit(query)
  return values
}

describe('withLockedFinancialProfile', () => {
  beforeEach(() => vi.clearAllMocks())

  it('locks the owned profile and runs the mutation inside the transaction', async () => {
    const callback = vi.fn().mockResolvedValue('result')
    const forUpdate = vi.fn().mockResolvedValue([profile])
    const where = vi.fn().mockReturnValue({ for: forUpdate })
    const from = vi.fn().mockReturnValue({ where })
    const tx = {
      select: vi.fn().mockReturnValue({
        from,
      }),
    }
    vi.mocked(db.transaction).mockImplementation(async (transaction) => transaction(tx as never))

    await expect(withLockedFinancialProfile('user-1', callback)).resolves.toBe('result')
    expect(from).toHaveBeenCalledWith(financialProfiles)
    expect(getSqlParamValues(where.mock.calls[0][0])).toEqual(['user-1'])
    expect(forUpdate).toHaveBeenCalledWith('update')
    expect(callback).toHaveBeenCalledWith(tx, profile)
  })

  it('rejects mutations when the profile is missing', async () => {
    const tx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            for: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }
    vi.mocked(db.transaction).mockImplementation(async (transaction) => transaction(tx as never))

    await expect(withLockedFinancialProfile('user-1', vi.fn())).rejects.toThrow(
      'Financial profile not found.',
    )
  })
})
