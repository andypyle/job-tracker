import { useId, useState } from 'react'
import { ApplicationForm } from '../ApplicationForm/ApplicationForm'
import type { ApplicationFormValues } from '../ApplicationForm/ApplicationForm.types'
import { Button } from '../Button/Button'
import { Dialog } from '../Dialog/Dialog'
import type { ApplicationDialogProps } from './ApplicationDialog.types'

/**
 * The Add and Edit application dialog: a large Dialog (a sheet below md) around ApplicationForm,
 * with Cancel and the submit button in the footer. Saving is the caller's job (`onSubmit`).
 */
export function ApplicationDialog({
  open,
  onClose,
  application,
  onSubmit,
  fetchDetails,
  allowUploads,
}: ApplicationDialogProps) {
  const formId = useId()
  const [saving, setSaving] = useState(false)
  const editing = application !== undefined

  // Remount the form on each opening, so Add starts blank and Edit drops a cancelled change.
  // The form stays mounted while closed, so the exit motion still shows it.
  const [opening, setOpening] = useState(0)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setOpening((n) => n + 1)
  }

  const submit = async (values: ApplicationFormValues) => {
    setSaving(true)
    try {
      await onSubmit(values)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!saving) onClose()
      }}
      size="large"
      title={editing ? 'Edit application' : 'Add application'}
      description={editing ? undefined : 'Paste a job link to fill in the details. You can edit everything later.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Save application'}
          </Button>
        </>
      }
    >
      <ApplicationForm
        key={`${application?.id ?? 'new'}-${opening}`}
        id={formId}
        application={application}
        onSubmit={submit}
        fetchDetails={fetchDetails}
        allowUploads={allowUploads}
      />
    </Dialog>
  )
}
