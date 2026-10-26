import type { ReactNode } from 'react'
import { SheetLoadingState } from '../../../../components/SheetLoadingState'
import { Sheet } from '../../../../components/ui/sheet'
import { SidePanelContent, SidePanelHeader } from '../../../../components/norte/SidePanel'

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
      <SidePanelContent>
        <SidePanelHeader title={title} description={description} />
        {loading ? (
          <SheetLoadingState />
        ) : error ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <p role="alert" className="text-sm text-destructive">{error}</p>
          </div>
        ) : (
          children
        )}
      </SidePanelContent>
    </Sheet>
  )
}
