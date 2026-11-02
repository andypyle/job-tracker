import type { Application } from '@jobtracker/shared'
import type { ApplicationFormValues } from '../components/ApplicationForm/ApplicationForm.types'
import { createApplication, deleteFile, updateApplication, uploadFile } from './api'

type FileType = 'resume' | 'cover_letter'

export interface SaveApplicationApi {
  createApplication: typeof createApplication
  updateApplication: typeof updateApplication
  uploadFile: typeof uploadFile
  deleteFile: typeof deleteFile
}

export interface SaveApplicationResult {
  application: Application
  /** Files whose upload or removal failed after the application itself saved */
  failedFiles: FileType[]
}

export const fileLabels: Record<FileType, string> = { resume: 'résumé', cover_letter: 'cover letter' }

/**
 * Creates the application (or updates `existing`), then uploads or deletes its files. A failed
 * create or update throws, so the form stays open with the message. File failures don't throw:
 * the application is saved by then, and saving again would create it twice, so they come back
 * in `failedFiles` for the caller to report.
 */
export async function saveApplication(
  { application, resume, coverLetter }: ApplicationFormValues,
  existing?: Application,
  api: SaveApplicationApi = { createApplication, updateApplication, uploadFile, deleteFile },
): Promise<SaveApplicationResult> {
  const saved = existing
    ? await api.updateApplication(existing.id, application)
    : await api.createApplication(application)

  const files: [FileType, File | null | undefined][] = [
    ['resume', resume],
    ['cover_letter', coverLetter],
  ]
  const results = await Promise.all(
    files.map(async ([type, file]) => {
      if (file === undefined) return null
      try {
        if (file) await api.uploadFile(saved.id, type, file)
        else await api.deleteFile(saved.id, type)
        return null
      } catch {
        return type
      }
    }),
  )
  return { application: saved, failedFiles: results.filter((type) => type !== null) }
}
