import type { Application } from '@jobtracker/shared'

export interface DashboardStats {
  total: number
  /** Applications with status "Applied" or "Interviewing" */
  active: number
  /** Applications with status "Offer" */
  offers: number
  /**
   * Percentage of applications that received a substantive response.
   * Formula: (Interviewing + Offer + Rejected + Role Eliminated) / total * 100
   * Rounded to 1 decimal place. Returns 0 when total is 0.
   */
  responseRate: number
}

export function calculateDashboardStats(
  applications: Application[],
): DashboardStats {
  const total = applications.length

  if (total === 0) {
    return { total: 0, active: 0, offers: 0, responseRate: 0 }
  }

  let active = 0
  let offers = 0
  let responded = 0

  for (const app of applications) {
    if (app.status === 'Applied' || app.status === 'Interviewing') {
      active++
    }
    if (app.status === 'Offer') {
      offers++
    }
    if (
      app.status === 'Interviewing' ||
      app.status === 'Offer' ||
      app.status === 'Rejected' ||
      app.status === 'Role Eliminated'
    ) {
      responded++
    }
  }

  const responseRate = Math.round((responded / total) * 1000) / 10

  return { total, active, offers, responseRate }
}
