import type { ReactNode } from 'react'
import { SheetLoadingState } from '../../../../components/SheetLoadingState'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../../../../components/ui/sheet'

export function GoalContextSheet({
  open,
  onOpenChange,
  title,
  description,
  loading,
  error,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  loading: boolean
  error: string | null
  children: ReactNode
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:w-[450px] data-[side=right]:sm:max-w-[450px]"
      >
        <SheetHeader className="border-b border-[var(--line)] px-6 py-5">
          <SheetTitle className="font-serif text-2xl font-bold text-[var(--sea-ink)]">{title}</SheetTitle>
          <SheetDescription className="text-sm text-[var(--sea-ink-soft)]">{description}</SheetDescription>
        </SheetHeader>
        {loading ? (
          <SheetLoadingState />
        ) : error ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <p role="alert" className="text-sm text-destructive">{error}</p>
          </div>
        ) : (
          children
        )}
      </SheetContent>
    </Sheet>
  )
}
