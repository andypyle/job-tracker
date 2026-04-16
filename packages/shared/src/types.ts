export type ApplicationStatus =
  | 'Applied'
  | 'Interviewing'
  | 'Unlikely'
  | 'Offer'
  | 'Rejected'
  | 'Role Eliminated'

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
>

export type ApplicationUpdate = Partial<
  ApplicationCreate & { status: ApplicationStatus }
>
