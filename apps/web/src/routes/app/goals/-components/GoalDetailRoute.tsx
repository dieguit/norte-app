import { useState, useSyncExternalStore } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../../../../components/ui/sheet'
import { GoalDetail } from './GoalDetail'
import { GoalNotFound } from './GoalsRouteStates'
import type { GoalWorkspaceItem } from '../../../../features/goals/goals'

export interface GoalDetailRouteProps {
  goal?: GoalWorkspaceItem
}

function subscribeToMediaQuery(callback: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {}
  }
  const mql = window.matchMedia('(min-width: 768px)')
  mql.addEventListener?.('change', callback)
  return () => {
    mql.removeEventListener?.('change', callback)
  }
}

function getDesktopSnapshot() {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false
  }
  return window.matchMedia('(min-width: 768px)').matches
}

function getServerSnapshot() {
  return false
}

export function useIsDesktop() {
  return useSyncExternalStore(subscribeToMediaQuery, getDesktopSnapshot, getServerSnapshot)
}

export function GoalDetailRoute({ goal }: GoalDetailRouteProps) {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [open, setOpen] = useState(true)

  if (!goal) {
    return <GoalNotFound />
  }

  const closeDetail = () => {
    navigate({ to: '/app/goals' })
  }

  if (isDesktop) {
    return (
      <Sheet
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen)
          if (!isOpen) {
            closeDetail()
          }
        }}
      >
        <SheetContent
           side="right"
           className="w-full overflow-y-auto bg-[var(--sand)] sm:max-w-xl"
           finalFocus={() => document.getElementById(`goal-link-${goal.id}`)}
         >
          <SheetHeader>
            <SheetTitle>{goal.name}</SheetTitle>
            <SheetDescription>Detalle del objetivo, su valor actual y su Plan.</SheetDescription>
          </SheetHeader>
          <GoalDetail goal={goal} />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-8 sm:px-8 sm:py-12">
      <div>
        <Link
          to="/app/goals"
          className="inline-flex min-h-[44px] items-center text-sm font-medium text-[var(--lagoon-deep)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lagoon)] rounded-sm"
        >
          Volver a objetivos
        </Link>
      </div>
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-4xl">
          {goal.name}
        </h1>
        <p className="mt-2 text-base leading-relaxed text-[var(--sea-ink-soft)]">
          Detalle del objetivo, su valor actual y su Plan.
        </p>
      </div>
      <GoalDetail goal={goal} />
    </div>
  )
}
