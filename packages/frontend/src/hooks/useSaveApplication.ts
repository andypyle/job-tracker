import type { Application } from '@jobtracker/shared'
import { useQueryClient } from '@tanstack/react-query'
import type { ApplicationFormValues } from '../components/ApplicationForm/ApplicationForm.types'
import { fileLabels, saveApplication } from '../lib/saveApplication'
import { toast } from '../lib/toast'

/**
 * Saves the Add or Edit application dialog (pass `existing` for Edit) and refreshes the lists,
 * the dashboard and the detail page. Resolves once they've refetched, so the dialog closes on
 * fresh data, then confirms with a toast. A failed save throws for the form to show; a file that
 * didn't upload gets a warning toast, since the application itself is saved.
 */
export function useSaveApplication() {
  const queryClient = useQueryClient()

  return async (values: ApplicationFormValues, existing?: Application): Promise<Application> => {
    const { application, failedFiles } = await saveApplication(values, existing)

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['applications'] }),
      queryClient.invalidateQueries({ queryKey: ['application', application.id] }),
      queryClient.invalidateQueries({ queryKey: ['timeline-stats'] }),
    ])

    toast({
      tone: 'positive',
      title: existing ? 'Changes saved' : 'Application added',
      message: `${application.job_title} at ${application.company}`,
    })
    if (failedFiles.length > 0) {
      toast({
        tone: 'warning',
        title: `Couldn’t update the ${failedFiles.map((type) => fileLabels[type]).join(' or ')}`,
        message: 'The application is saved. Edit it to try the file again.',
      })
    }
    return application
  }
}
