import { useStore } from '@tanstack/react-form'
import { FieldGroup, FieldSet } from '../../../../components/ui/field'
import type { GoalCreationContext } from '../../../../features/goals/goal-creation'
import type { GoalCreationFormApi } from './useGoalCreationForm'
import {
  GoalMoneyFields,
  GoalNameField,
  GoalTypeField,
  StrategyFields,
} from './GoalObjectiveFieldsParts'

export interface GoalObjectiveFieldsProps {
  form: GoalCreationFormApi
  context: GoalCreationContext
  validationErrors?: Record<string, string>
  immutableIdentity?: boolean
  showStrategyFields?: boolean
}

export function GoalObjectiveFields({
  form,
  context,
  validationErrors = {},
  immutableIdentity = false,
  showStrategyFields = true,
}: GoalObjectiveFieldsProps) {
  const values = useStore(form.store, (state) => state.values)
  const isEmergencyFund = values.type === 'emergency_fund'

  return (
    <FieldGroup className="flex flex-col gap-4">
      <FieldSet className="flex flex-col gap-5">
        <GoalTypeField
          form={form}
          values={values}
          validationErrors={validationErrors}
          immutableIdentity={immutableIdentity}
          hasEmergencyFund={context.hasEmergencyFund}
        />
        {!isEmergencyFund && (
          <GoalNameField form={form} values={values} validationErrors={validationErrors} immutableIdentity={immutableIdentity} />
        )}
        <GoalMoneyFields
          form={form}
          values={values}
          validationErrors={validationErrors}
          immutableIdentity={immutableIdentity}
          context={context}
        />
        {showStrategyFields && (
          <StrategyFields
            form={form}
            values={values}
            validationErrors={validationErrors}
            immutableIdentity={immutableIdentity}
            context={context}
          />
        )}
      </FieldSet>
    </FieldGroup>
  )
}
