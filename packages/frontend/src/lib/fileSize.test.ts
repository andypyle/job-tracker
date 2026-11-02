import { describe, expect, it } from 'vitest'
import { formatFileSize, formatUploadProgress, uploadPercent } from './fileSize'

describe('formatFileSize', () => {
  it('shows KB as whole numbers, never below 1', () => {
    expect(formatFileSize(182 * 1024)).toBe('182 KB')
    expect(formatFileSize(200)).toBe('1 KB')
    expect(formatFileSize(0)).toBe('1 KB')
  })

  it('shows MB with one decimal and drops a trailing .0', () => {
    expect(formatFileSize(14 * 1024 * 1024)).toBe('14 MB')
    expect(formatFileSize(1.44 * 1024 * 1024)).toBe('1.4 MB')
    expect(formatFileSize(10.2 * 1024 * 1024)).toBe('10.2 MB')
  })
})

describe('formatUploadProgress', () => {
  it('puts both amounts in the total unit', () => {
    expect(formatUploadProgress(113 * 1024, 182 * 1024)).toBe('62% · 113 of 182 KB')
    expect(formatUploadProgress(512 * 1024, 2 * 1024 * 1024)).toBe('25% · 0.5 of 2 MB')
  })
})

describe('uploadPercent', () => {
  it('rounds and clamps to 0–100', () => {
    expect(uploadPercent(1, 3)).toBe(33)
    expect(uploadPercent(5, 4)).toBe(100)
    expect(uploadPercent(1, 0)).toBe(0)
  })
})
