import { Button } from '../../../components/ui/button'

interface SavingContributionFooterProps {
  isSubmitting: boolean
  isEdit: boolean
  actionNoun: string
  isFormValid: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function SavingContributionFooter({
  isSubmitting,
  isEdit,
  actionNoun,
  isFormValid,
  onCancel,
  onConfirm,
}: SavingContributionFooterProps) {
  return (
    <div className="sticky bottom-0 flex items-center justify-between border-t border-[var(--line)] bg-popover px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
      <Button type="button" disabled={!isFormValid} onClick={onConfirm}>
        {isSubmitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : `Confirmar ${actionNoun}`}
      </Button>
    </div>
  )
}
