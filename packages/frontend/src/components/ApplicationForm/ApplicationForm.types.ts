import type { FormHTMLAttributes } from 'react'
import type { Application, ApplicationCreate } from '@jobtracker/shared'
import type { OpenGraphResult } from '../../lib/api'

export interface ApplicationFormValues {
  /** Trimmed fields, with empty optional ones left out */
  application: ApplicationCreate
  /** A new PDF to upload, `null` to delete the saved one, or `undefined` to leave it as is */
  resume?: File | null
  /** A new PDF to upload, `null` to delete the saved one, or `undefined` to leave it as is */
  coverLetter?: File | null
}

/**
 * The fields of the Add and Edit application dialogs. The form has no buttons: the dialog's
 * footer holds them, and its submit button points here with `form={id}`.
 */
export interface ApplicationFormProps
  extends Omit<FormHTMLAttributes<HTMLFormElement>, 'onSubmit' | 'children' | 'id'> {
  /** For the footer's submit button (`<Button type="submit" form={id}>`) */
  id: string
  /** Edit: prefills the form, and shows its saved files */
  application?: Application
  /**
   * Saves the application and its files (create or update, then upload or delete). Throw to
   * keep the form open: the error's message shows in an Alert above the fields.
   */
  onSubmit: (values: ApplicationFormValues) => Promise<unknown> | void
  /** Looks up a pasted job link. Defaults to `fetchOpenGraph`; stories pass a stand-in. */
  fetchDetails?: (url: string) => Promise<OpenGraphResult>
}
