import { createContext, useContext, type AriaAttributes } from 'react'

export interface FormFieldContextValue {
  /** The control's id, which the label points at */
  id: string
  /** The label's own id, for parts that need naming too (the Select listbox) */
  labelId: string
  /** The hint or error element, whichever is showing */
  describedBy?: string
  invalid: boolean
}

export const FormFieldContext = createContext<FormFieldContextValue | null>(null)

interface FieldControlProps {
  id?: string
  'aria-describedby'?: string
  'aria-invalid'?: AriaAttributes['aria-invalid']
}

/**
 * Wires a control (Input, Textarea, Select) to the FormField around it: the id its label
 * points at, aria-describedby for the hint or error, and aria-invalid. Props the caller
 * passes win. Outside a FormField the props pass through unchanged.
 */
export function useFieldControlProps(props: FieldControlProps): FieldControlProps {
  const field = useContext(FormFieldContext)
  return {
    id: props.id ?? field?.id,
    'aria-describedby': props['aria-describedby'] ?? field?.describedBy,
    'aria-invalid': props['aria-invalid'] ?? (field?.invalid || undefined),
  }
}
