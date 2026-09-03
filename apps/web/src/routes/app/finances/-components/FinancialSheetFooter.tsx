import { Button } from '../../../../components/ui/button'

type FinancialSheetFooterProps = {
  saving: boolean
  onRemove?: () => void
}

export function FinancialSheetFooter({ saving, onRemove }: FinancialSheetFooterProps) {
  return (
    <div className="mt-auto flex gap-3 pt-4">
      {onRemove && (
        <Button type="button" variant="destructive" onClick={onRemove} disabled={saving}>
          Eliminar
        </Button>
      )}
      <Button type="submit" disabled={saving} className="flex-1">
        {saving ? 'Guardando...' : 'Guardar'}
      </Button>
    </div>
  )
}
