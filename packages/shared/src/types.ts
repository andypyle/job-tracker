export type ApplicationStatus =
  | 'Applied'
  | 'Interviewing'
  | 'Unlikely'
  | 'Offer'
  | 'Rejected'
  | 'Role Eliminated'

export interface StatusChange {
  id: string
  application_id: string
  /** null indicates initial creation — there was no prior status */
  old_status: ApplicationStatus | null
  new_status: ApplicationStatus
  /** ISO datetime string */
  changed_at: string
  is_automatic: boolean
}

export interface Application {
  id: string
  user_id: string
  job_post_url?: string
  job_title: string
  company: string
  company_logo_url?: string
  industry?: string
  compensation?: string
  notes?: string
  is_referral: boolean
  resume_path?: string
  cover_letter_path?: string
  /** signed URL, not stored */
  resume_url?: string
  /** signed URL, not stored */
  cover_letter_url?: string
  /** ISO date string */
  date_applied: string
  status: ApplicationStatus
  created_at: string
  updated_at: string
  /** Status change history, returned by GET /applications/{id} */
  status_history?: StatusChange[]
}

export type ApplicationCreate = Omit<
  Application,
  | 'id'
  | 'user_id'
  | 'status'
  | 'created_at'
  | 'updated_at'
  | 'resume_url'
  | 'cover_letter_url'
  | 'status_history'
>

export type ApplicationUpdate = Partial<
  ApplicationCreate & { status: ApplicationStatus }
>

// ---------------------------------------------------------------------------
// Timeline / velocity stats
// ---------------------------------------------------------------------------

/**
 * Sample sizes for each timeline metric.
 * Each count reflects the number of applications used to compute the metric —
 * lower counts mean the metric is less reliable.
 */
export interface TimelineStatsSampleSizes {
  response_time: number
  conversion_rate: number
  interview_to_outcome: number
}

/**
 * Shape of the payload returned by GET /stats/timeline.
 * All three metric values may be null when there is insufficient data.
 */
export interface TimelineStats {
  /** Average calendar days from application to first substantive response */
  avg_response_days: number | null
  /** Fraction of applications that reached the Interviewing stage (0–1) */
  interview_conversion_rate: number | null
  /** Average calendar days from interview start to final outcome */
  avg_interview_to_outcome_days: number | null
  sample_sizes: TimelineStatsSampleSizes
}
