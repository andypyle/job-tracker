import axios from 'axios'
import type {
  Application,
  ApplicationCreate,
  ApplicationStatus,
  ApplicationUpdate,
  TimelineStats,
} from '@jobtracker/shared'
import { supabase } from './supabase'

/**
 * Axios instance for all FastAPI backend requests.
 * Never call fetch() directly in components — use this instance.
 */
const api = axios.create({
  baseURL: window.__env__?.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL as string,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach the Supabase JWT to every outgoing request.
api.interceptors.request.use(async (config) => {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }

  return config
})

// ---------------------------------------------------------------------------
// Response envelope helper
// ---------------------------------------------------------------------------

/** Shape of every response from the FastAPI backend. */
interface ApiEnvelope<T> {
  data: T | null
  error: string | null
}

/**
 * Unwrap the `{ data, error }` envelope.
 * Throws an Error with the server's message when `error` is set.
 * Throws when `data` is null and no error was provided (should not happen).
 */
function unwrap<T>(envelope: ApiEnvelope<T>): T {
  if (envelope.error) {
    throw new Error(envelope.error)
  }
  if (envelope.data === null || envelope.data === undefined) {
    throw new Error('Unexpected empty response from server')
  }
  return envelope.data
}

// ---------------------------------------------------------------------------
// Applications CRUD
// ---------------------------------------------------------------------------

/**
 * List all applications for the current user, optionally filtered by status.
 */
export async function getApplications(
  status?: ApplicationStatus,
): Promise<Application[]> {
  const params = status ? { status } : undefined
  const res = await api.get<ApiEnvelope<Application[]>>('/applications', {
    params,
  })
  return unwrap(res.data)
}

/**
 * Fetch a single application by ID.
 * The response includes signed `resume_url` and `cover_letter_url` if files exist.
 */
export async function getApplication(id: string): Promise<Application> {
  const res = await api.get<ApiEnvelope<Application>>(`/applications/${id}`)
  return unwrap(res.data)
}

/**
 * Create a new application. Status defaults to "Applied" on the backend.
 */
export async function createApplication(
  data: ApplicationCreate,
): Promise<Application> {
  const res = await api.post<ApiEnvelope<Application>>('/applications', data)
  return unwrap(res.data)
}

/**
 * Partially update an existing application (status, fields, etc.).
 */
export async function updateApplication(
  id: string,
  data: ApplicationUpdate,
): Promise<Application> {
  const res = await api.patch<ApiEnvelope<Application>>(
    `/applications/${id}`,
    data,
  )
  return unwrap(res.data)
}

/**
 * Delete an application and its associated files from Storage.
 */
export async function deleteApplication(id: string): Promise<void> {
  await api.delete(`/applications/${id}`)
}

// ---------------------------------------------------------------------------
// File uploads / deletions
// ---------------------------------------------------------------------------

/**
 * Upload a resume or cover letter PDF for an application.
 * Uses multipart/form-data — Content-Type is intentionally NOT set manually
 * so that axios includes the correct multipart boundary automatically.
 */
export async function uploadFile(
  applicationId: string,
  fileType: 'resume' | 'cover_letter',
  file: File,
): Promise<{ path: string }> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await api.post<ApiEnvelope<{ path: string }>>(
    `/applications/${applicationId}/${fileType}`,
    formData,
    {
      // Let axios derive Content-Type with the multipart boundary from FormData.
      headers: { 'Content-Type': undefined },
    },
  )
  return unwrap(res.data)
}

/**
 * Delete an attached file (resume or cover letter) from an application.
 */
export async function deleteFile(
  applicationId: string,
  fileType: 'resume' | 'cover_letter',
): Promise<void> {
  await api.delete(`/applications/${applicationId}/${fileType}`)
}

// ---------------------------------------------------------------------------
// OpenGraph
// ---------------------------------------------------------------------------

export interface OpenGraphResult {
  title: string | null
  company: string | null
  logo_url: string | null
}

/**
 * Fetch OpenGraph metadata for a job post URL.
 * The backend never throws for OG failures — it returns nulls instead.
 * This function follows the same contract: callers should handle null fields
 * gracefully and must NOT surface errors to the user.
 */
export async function fetchOpenGraph(url: string): Promise<OpenGraphResult> {
  const res = await api.post<ApiEnvelope<OpenGraphResult>>('/opengraph', {
    url,
  })
  return unwrap(res.data)
}

// ---------------------------------------------------------------------------
// Stats / Timeline
// ---------------------------------------------------------------------------

/**
 * Fetch velocity and timeline metrics from GET /stats/timeline.
 *
 * All three metric values may be null when there is insufficient history
 * (e.g., status tracking was just enabled and most applications have no
 * recorded transitions yet). The UI must handle nulls gracefully.
 */
export async function getTimelineStats(): Promise<TimelineStats> {
  const res = await api.get<ApiEnvelope<TimelineStats>>('/stats/timeline')
  return unwrap(res.data)
}

export default api
