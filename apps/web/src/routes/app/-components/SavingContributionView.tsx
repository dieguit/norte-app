import { SavingsPlacePicker } from './SavingsPlacePicker'
import { SavingContributionCurrencyChoice } from './SavingContributionCurrencyChoice'
import { SavingContributionEligibility } from './SavingContributionEligibility'
import { SavingContributionFeedback } from './SavingContributionFeedback'
import { SavingContributionFooter } from './SavingContributionFooter'
import { SavingContributionInputs } from './SavingContributionInputs'
import { SavingContributionPreview } from './SavingContributionPreview'
import { SavingContributionTarget } from './SavingContributionTarget'
import type { useSavingContributionController } from './useSavingContributionController'

type SavingContributionViewModel = ReturnType<typeof useSavingContributionController>

export function SavingContributionView(model: SavingContributionViewModel) {
  const {
    currency: propCurrency,
    context,
    catchUpMonth,
    onCancel,
    draft,
    kind,
    isEdit,
    previewState,
    confirmation,
    staleMessage,
    alertRef,
    placeError,
    placeTouched,
    onPlaceBlur,
    actionNoun,
    isFormValid,
  } = model
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">
        {!propCurrency && <SavingContributionCurrencyChoice kind={kind} currency={draft.currency} disabled={isEdit} onChange={draft.handleCurrencyChange} />}
        <SavingContributionTarget kind={kind} currency={draft.currency} context={context} hidden={isEdit || !!catchUpMonth || !previewState.hasEligibleGoals} />
        <SavingContributionFeedback serverError={previewState.serverError} placeError={placeError} staleMessage={staleMessage} catchUpMonth={catchUpMonth} alertRef={alertRef} />
        <SavingContributionInputs currency={draft.currency} amount={draft.amount} arsSpent={draft.arsSpent} effectiveRate={draft.effectiveRate} validationError={previewState.validationError} onAmountChange={draft.handleAmountChange} onArsSpentChange={draft.handleArsSpentChange} onRateChange={draft.handleRateChange} />
        {kind === 'saving' && (
          <SavingsPlacePicker
            places={context?.places ?? []}
            value={draft.place}
            onChange={draft.setPlace}
            disabled={confirmation.isSubmitting}
            error={placeError}
            touched={placeTouched}
            onBlur={onPlaceBlur}
          />
        )}
        <SavingContributionEligibility kind={kind} currency={draft.currency} hasEligibleGoals={previewState.hasEligibleGoals} hasIncompleteInvestmentData={previewState.hasIncompleteInvestmentData} />
        <SavingContributionPreview actionNoun={actionNoun} preview={previewState.preview} />
      </div>
      <SavingContributionFooter isSubmitting={confirmation.isSubmitting} isEdit={isEdit} actionNoun={actionNoun} isFormValid={isFormValid} onCancel={onCancel} onConfirm={confirmation.handleConfirm} />
    </div>
  )
}
