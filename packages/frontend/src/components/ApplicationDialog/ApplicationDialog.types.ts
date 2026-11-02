import type { Application } from '@jobtracker/shared'
import type { ApplicationFormProps, ApplicationFormValues } from '../ApplicationForm/ApplicationForm.types'

export interface ApplicationDialogProps {
  /** Controlled, like Dialog. Each opening starts from a fresh form. */
  open: boolean
  /** Cancel, the close button, Esc or the scrim. Ignored while saving. */
  onClose: () => void
  /** Edit: prefills the form and changes the title and button. Leave out for Add. */
  application?: Application
  /**
   * Saves the application and its files. While the promise is pending the footer reads
   * "Saving…" and the dialog stays open; throw to show the message above the fields. Close the
   * dialog (set `open` to false) once it resolves.
   */
  onSubmit: (values: ApplicationFormValues) => Promise<unknown>
  /** Passed to ApplicationForm; stories pass a stand-in */
  fetchDetails?: ApplicationFormProps['fetchDetails']
}
