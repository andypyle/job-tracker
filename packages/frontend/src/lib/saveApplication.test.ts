import { describe, expect, it, vi } from 'vitest'
import type { Application, ApplicationCreate } from '@jobtracker/shared'
import { saveApplication, type SaveApplicationApi } from './saveApplication'

const fields: ApplicationCreate = {
  job_title: 'Product Designer',
  company: 'Acme',
  is_referral: false,
  date_applied: '2026-10-01',
}

const saved: Application = {
  ...fields,
  id: 'app-1',
  user_id: 'user-1',
  status: 'Applied',
  created_at: '2026-10-01T12:00:00Z',
  updated_at: '2026-10-01T12:00:00Z',
}

const pdf = new File(['%PDF'], 'resume.pdf', { type: 'application/pdf' })

function fakeApi(overrides: Partial<SaveApplicationApi> = {}) {
  return {
    createApplication: vi.fn(async () => saved),
    updateApplication: vi.fn(async () => saved),
    uploadFile: vi.fn(async () => ({ path: 'p' })),
    deleteFile: vi.fn(async () => {}),
    ...overrides,
  }
}

describe('saveApplication', () => {
  it('creates without an existing application', async () => {
    const api = fakeApi()
    const result = await saveApplication({ application: fields }, undefined, api)
    expect(api.createApplication).toHaveBeenCalledWith(fields)
    expect(api.updateApplication).not.toHaveBeenCalled()
    expect(result).toEqual({ application: saved, failedFiles: [] })
  })

  it('updates an existing application', async () => {
    const api = fakeApi()
    await saveApplication({ application: fields }, saved, api)
    expect(api.updateApplication).toHaveBeenCalledWith('app-1', fields)
    expect(api.createApplication).not.toHaveBeenCalled()
  })

  it('uploads a new file, deletes a removed one, and leaves an untouched one alone', async () => {
    const api = fakeApi()
    await saveApplication({ application: fields, resume: pdf, coverLetter: null }, saved, api)
    expect(api.uploadFile).toHaveBeenCalledExactlyOnceWith('app-1', 'resume', pdf)
    expect(api.deleteFile).toHaveBeenCalledExactlyOnceWith('app-1', 'cover_letter')

    const untouched = fakeApi()
    await saveApplication({ application: fields }, saved, untouched)
    expect(untouched.uploadFile).not.toHaveBeenCalled()
    expect(untouched.deleteFile).not.toHaveBeenCalled()
  })

  it('throws when the application itself fails, before touching files', async () => {
    const api = fakeApi({ createApplication: vi.fn(async () => Promise.reject(new Error('offline'))) })
    await expect(saveApplication({ application: fields, resume: pdf }, undefined, api)).rejects.toThrow('offline')
    expect(api.uploadFile).not.toHaveBeenCalled()
  })

  it('reports failed files without throwing, since the application is saved', async () => {
    const api = fakeApi({ uploadFile: vi.fn(async () => Promise.reject(new Error('too big'))) })
    const result = await saveApplication({ application: fields, resume: pdf, coverLetter: null }, undefined, api)
    expect(result).toEqual({ application: saved, failedFiles: ['resume'] })
    expect(api.deleteFile).toHaveBeenCalledOnce()
  })
})
