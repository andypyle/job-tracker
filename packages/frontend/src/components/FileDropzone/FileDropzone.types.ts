import type { AriaAttributes } from 'react'

/** The attached file. A `File` fits; for a saved upload pass its name (and size, if known). */
export interface FileDropzoneFile {
  name: string
  size?: number
}

export interface UploadProgress {
  /** Bytes sent so far */
  loaded: number
  /** Bytes in all */
  total: number
}

/**
 * Single PDF upload, controlled. The dropzone checks type and size itself and only calls
 * `onSelect` with a valid file; the parent keeps it in `value` and, while it uploads, passes
 * `progress`. Clearing `progress` with `value` still set and no `error` shows Complete for
 * about 800ms, then the filled row. Pair with FormField for the label, hint and field error.
 */
export interface FileDropzoneProps {
  value?: FileDropzoneFile | null
  /** A PDF of 10 MB or less was picked or dropped */
  onSelect: (file: File) => void
  /** The x on the filled or failed row. Set `value` (and `error`) back to empty. */
  onRemove: () => void
  /** Set while uploading */
  progress?: UploadProgress | null
  /** Shows the cancel button while uploading. Clear `progress` and `value` when it's called. */
  onCancel?: () => void
  /** Why the upload failed, in plain words. Shown in the row with `value`'s name. */
  error?: string
  /** For the `<input type="file">`; FormField sets these through context */
  id?: string
  'aria-describedby'?: string
  'aria-invalid'?: AriaAttributes['aria-invalid']
  className?: string
}
