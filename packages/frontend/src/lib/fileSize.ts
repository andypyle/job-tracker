// File sizes in plain words: "182 KB", "1.4 MB", "14 MB". Binary units, as file managers show them.

const KB = 1024
const MB = 1024 * 1024

/** Uploads are capped at 10 MB (the backend enforces the same limit) */
export const MAX_UPLOAD_BYTES = 10 * MB

function unitFor(bytes: number): { divisor: number; unit: 'KB' | 'MB' } {
  return bytes < MB ? { divisor: KB, unit: 'KB' } : { divisor: MB, unit: 'MB' }
}

// KB rounds to whole numbers (never below 1); MB keeps one decimal, dropping a trailing ".0",
// so a 10.2 MB file doesn't read as "10 MB" next to a 10 MB limit.
function amount(bytes: number, divisor: number): string {
  if (divisor === KB) return String(Math.max(1, Math.round(bytes / KB)))
  return String(Number((bytes / MB).toFixed(1)))
}

export function formatFileSize(bytes: number): string {
  const { divisor, unit } = unitFor(bytes)
  return `${amount(bytes, divisor)} ${unit}`
}

/** "62% · 113 of 182 KB": both amounts in the total's unit */
export function formatUploadProgress(loaded: number, total: number): string {
  const percent = uploadPercent(loaded, total)
  const { divisor, unit } = unitFor(total)
  return `${percent}% · ${amount(loaded, divisor)} of ${amount(total, divisor)} ${unit}`
}

export function uploadPercent(loaded: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((loaded / total) * 100)))
}
