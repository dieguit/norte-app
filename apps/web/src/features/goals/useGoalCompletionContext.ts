import { useEffect, useRef, useState } from 'react'
import { getGoalCompletionContext } from './goals.functions'
import type { GoalCompletionContext } from './goal-completion'

export function useGoalCompletionContext(open: boolean, goalId: string | null) {
  const [context, setContext] = useState<GoalCompletionContext | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestGeneration = useRef(0)

  async function loadContext(generation: number, requestedGoalId: string) {
    setLoading(true)
    setError(null)
    const isCurrent = () => generation === requestGeneration.current && open && goalId === requestedGoalId
    try {
      const result = await getGoalCompletionContext({ data: { goalId: requestedGoalId } })
      if (!isCurrent()) return
      if (result.profile === 'missing') {
        setContext(null)
        setError('Completá tu perfil financiero antes de completar un objetivo.')
      } else {
        setContext(result.context)
      }
    } catch (requestError: any) {
      if (isCurrent()) {
        setContext(null)
        setError(requestError?.message ?? 'No pudimos cargar el objetivo.')
      }
    } finally {
      if (isCurrent()) setLoading(false)
    }
  }

  useEffect(() => {
    const generation = ++requestGeneration.current
    if (!open || !goalId) {
      setContext(null)
      setError(null)
      setLoading(false)
      return
    }
    if (context && context.goalId !== goalId) setContext(null)
    void loadContext(generation, goalId)
    return () => { requestGeneration.current += 1 }
  }, [open, goalId])

  async function reloadContext() {
    if (!goalId) return
    const generation = ++requestGeneration.current
    await loadContext(generation, goalId)
  }

  return { context, loading, error, reloadContext }
}
