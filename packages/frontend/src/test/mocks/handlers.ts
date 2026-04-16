import { http, HttpResponse } from 'msw'
import type { Application } from '@jobtracker/shared'

const BASE_URL = 'http://localhost:8000'

export const mockApplications: Application[] = [
  {
    id: 'app-uuid-1',
    user_id: 'user-uuid-1',
    job_title: 'Software Engineer',
    company: 'Acme Corp',
    company_logo_url: undefined,
    industry: 'Technology',
    compensation: '$150,000',
    is_referral: false,
    date_applied: '2026-04-01',
    status: 'Applied',
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'app-uuid-2',
    user_id: 'user-uuid-1',
    job_title: 'Senior Frontend Engineer',
    company: 'Big Tech',
    company_logo_url: 'https://bigtech.com/logo.png',
    is_referral: true,
    date_applied: '2026-03-15',
    status: 'Interviewing',
    created_at: '2026-03-15T00:00:00.000Z',
    updated_at: '2026-03-20T00:00:00.000Z',
  },
]

export const handlers = [
  // GET /applications
  http.get(`${BASE_URL}/applications`, ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')

    const filtered = status
      ? mockApplications.filter((a) => a.status === status)
      : mockApplications

    return HttpResponse.json({ data: filtered, error: null })
  }),

  // GET /applications/:id
  http.get(`${BASE_URL}/applications/:id`, ({ params }) => {
    const app = mockApplications.find((a) => a.id === params.id)
    if (!app) {
      return HttpResponse.json(
        { data: null, error: 'Application not found' },
        { status: 404 },
      )
    }
    return HttpResponse.json({ data: app, error: null })
  }),

  // POST /applications
  http.post(`${BASE_URL}/applications`, async ({ request }) => {
    const body = (await request.json()) as Partial<Application>
    const created: Application = {
      id: 'new-app-uuid',
      user_id: 'user-uuid-1',
      job_title: body.job_title ?? '',
      company: body.company ?? '',
      is_referral: body.is_referral ?? false,
      date_applied: body.date_applied ?? new Date().toISOString().split('T')[0],
      status: 'Applied',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    return HttpResponse.json({ data: created, error: null }, { status: 201 })
  }),

  // PATCH /applications/:id
  http.patch(`${BASE_URL}/applications/:id`, async ({ params, request }) => {
    const app = mockApplications.find((a) => a.id === params.id)
    if (!app) {
      return HttpResponse.json(
        { data: null, error: 'Application not found' },
        { status: 404 },
      )
    }
    const updates = (await request.json()) as Partial<Application>
    return HttpResponse.json({ data: { ...app, ...updates }, error: null })
  }),

  // DELETE /applications/:id
  http.delete(`${BASE_URL}/applications/:id`, ({ params }) => {
    const app = mockApplications.find((a) => a.id === params.id)
    if (!app) {
      return HttpResponse.json(
        { data: null, error: 'Application not found' },
        { status: 404 },
      )
    }
    return new HttpResponse(null, { status: 204 })
  }),

  // POST /opengraph
  http.post(`${BASE_URL}/opengraph`, async ({ request }) => {
    const body = (await request.json()) as { url: string }

    if (!body.url || body.url === 'https://unreachable.example.com') {
      return HttpResponse.json({
        data: { title: null, company: null, logo_url: null },
        error: null,
      })
    }

    return HttpResponse.json({
      data: {
        title: 'Software Engineer',
        company: 'Example Corp',
        logo_url: 'https://example.com/logo.png',
      },
      error: null,
    })
  }),
]
