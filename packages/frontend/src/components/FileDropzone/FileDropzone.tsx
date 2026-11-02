import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { colorTransition } from '../../lib/classes'
import { cn } from '../../lib/cn'
import {
  formatFileSize,
  formatUploadProgress,
  MAX_UPLOAD_BYTES,
  uploadPercent,
} from '../../lib/fileSize'
import { AnimatedIcon } from '../AnimatedIcon/AnimatedIcon'
import { loadIconAnimation } from '../AnimatedIcon/AnimatedIcon.animations'
import { useFieldControlProps } from '../FormField/FormField.context'
import { Icon } from '../Icon/Icon'
import type { FileDropzoneProps } from './FileDropzone.types'
import { FileRow } from './parts/FileRow/FileRow'

type View = 'empty' | 'uploading' | 'complete' | 'filled' | 'error'

/** Complete: the check draws in about 400ms, then holds for 800ms before the filled row */
const COMPLETE_MS = 400 + 800
/** The check Lottie runs 1.47s; this plays it in about 400ms (circle, then the check) */
const CHECK_SPEED = 3.6

function rejectionFor(file: File): string | null {
  if (file.type !== 'application/pdf') {
    const extension = /\.([^.]+)$/.exec(file.name)?.[1]?.toLowerCase()
    return extension
      ? `This is a .${extension} file. Upload a PDF instead.`
      : "This isn't a PDF. Upload a PDF instead."
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `This file is ${formatFileSize(file.size)}. The limit is ${formatFileSize(MAX_UPLOAD_BYTES)}.`
  }
  return null
}

// Status icons swap in with a fade (duration/base, 100ms for reduced motion). Complete and
// Error also pop from scale 0.9 on ease/bounce, motion-safe only. Enter motion only plays
// after the first render, so a form that opens with a file attached doesn't animate.
const iconSwap = 'flex transition-opacity duration-(--duration-base) ease-out motion-reduce:duration-100'
const iconEnter = 'starting:opacity-0'
const iconPop = 'motion-safe:animate-pop-in [--pop-from:0.9]'

export function FileDropzone({
  value,
  onSelect,
  onRemove,
  progress,
  onCancel,
  error,
  className,
  ...fieldProps
}: FileDropzoneProps) {
  const { id, 'aria-describedby': describedBy, 'aria-invalid': invalid } =
    useFieldControlProps(fieldProps)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const inputRef = useRef<HTMLInputElement>(null)
  const actionRef = useRef<HTMLButtonElement>(null)

  const [dragOver, setDragOver] = useState(false)
  // A file the dropzone turned down (wrong type, too big); value stays as it was
  const [rejection, setRejection] = useState<{ fileName: string; message: string } | null>(null)
  const [removing, setRemoving] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Complete: progress cleared while a file is still attached. Checked during render, so the
  // filled row never flashes before the check.
  const uploading = Boolean(value && progress)
  const [wasUploading, setWasUploading] = useState(uploading)
  const [completing, setCompleting] = useState(false)
  if (wasUploading !== uploading) {
    setWasUploading(uploading)
    setCompleting(!uploading && Boolean(value) && !error)
  }
  // Warm up the check so it draws from the start instead of jumping in once its chunk arrives
  useEffect(() => {
    if (uploading) void loadIconAnimation('check-circle')
  }, [uploading])
  useEffect(() => {
    if (!completing) return
    const timer = setTimeout(() => setCompleting(false), COMPLETE_MS)
    return () => clearTimeout(timer)
  }, [completing])

  const failure = rejection ?? (error ? { fileName: value?.name ?? 'Upload failed', message: error } : null)
  const failureText = failure && `${failure.fileName}: ${failure.message}`
  const view: View = failure
    ? 'error'
    : uploading
      ? 'uploading'
      : value
        ? completing
          ? 'complete'
          : 'filled'
        : 'empty'

  // Screen reader updates: the start and end of an upload, the result, a removal. Progress
  // itself is on the progressbar, so it isn't read out on every tick.
  const previous = useRef({ view, fileName: value?.name })
  useEffect(() => {
    const before = previous.current
    previous.current = { view, fileName: value?.name }
    if (before.view === view) return
    const messages: Record<View, string> = {
      uploading: `Uploading ${value?.name}`,
      complete: `${value?.name} uploaded`,
      filled: before.view === 'empty' ? `${value?.name} attached` : '',
      error: failureText ?? '',
      empty:
        before.view === 'uploading'
          ? `Upload of ${before.fileName} cancelled`
          : before.view === 'error'
            ? ''
            : `${before.fileName} removed`,
    }
    if (messages[view]) setAnnouncement(messages[view])
  }, [view, value?.name, failureText])

  // Focus follows the user's action across views: picking a file moves it to the row's button,
  // and the row's button returns it to the input. Waits until the view has actually changed,
  // since the parent updates `value` after onSelect or onRemove.
  const pendingFocus = useRef<{ target: 'input' | 'action'; from: View } | null>(null)
  useEffect(() => {
    const pending = pendingFocus.current
    if (!pending || pending.from === view) return
    pendingFocus.current = null
    ;(pending.target === 'input' ? inputRef : actionRef).current?.focus()
  })

  const removeTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(removeTimer.current), [])

  function accept(file: File | undefined, moveFocus: boolean) {
    if (!file) return
    if (moveFocus) pendingFocus.current = { target: 'action', from: view }
    const message = rejectionFor(file)
    if (message) setRejection({ fileName: file.name, message })
    else onSelect(file)
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    accept(event.target.files?.[0], true)
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    // Optional chaining for synthetic events, which may come without a dataTransfer
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
    setDragOver(true)
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    // Moving between the label's children fires dragleave too
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOver(false)
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragOver(false)
    accept(event.dataTransfer?.files[0], false)
  }

  function handleAction() {
    pendingFocus.current = { target: 'input', from: view }
    if (view === 'uploading') {
      onCancel?.()
    } else if (rejection) {
      setRejection(null)
    } else if (view === 'error') {
      onRemove()
    } else if (!removing) {
      // Filled or Complete: the row fades out first (160ms ease/in), then the zone fades in
      setRemoving(true)
      removeTimer.current = setTimeout(
        () => {
          setRemoving(false)
          setCompleting(false)
          onRemove()
        },
        reducedMotion ? 100 : 160,
      )
    }
  }

  return (
    <div className={cn('w-full', className)}>
      {view === 'empty' ? (
        <label
          data-dragover={dragOver || undefined}
          onDragEnter={handleDragOver}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'group flex h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-sm px-4 text-center',
            'border border-dashed border-border-strong bg-bg-surface',
            // Drag over: 2px dashed border/focus on bg/hover, over duration/fast
            'data-dragover:border-2 data-dragover:border-border-focus data-dragover:bg-bg-hover',
            'outline-offset-0 has-focus-visible:outline-2 has-focus-visible:outline-border-focus',
            colorTransition,
            'transition-[background-color,border-color,color,opacity] motion-reduce:duration-100',
            mounted && 'starting:opacity-0',
          )}
        >
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept="application/pdf"
            aria-describedby={describedBy}
            aria-invalid={invalid}
            onChange={handleChange}
            className="sr-only"
          />
          {/* The arrow lifts 3px on drag over, ready to catch the file */}
          <Icon
            name="upload"
            size={20}
            className="text-text-primary transition-[translate] duration-(--duration-fast) ease-bounce group-data-dragover:-translate-y-[3px] motion-reduce:translate-none"
          />
          <span className="text-label-small text-text-primary">
            {dragOver ? 'Drop to upload' : 'Upload PDF or drag it here'}
          </span>
          <span className="text-caption-regular text-text-muted">
            PDF, max {formatFileSize(MAX_UPLOAD_BYTES)}
          </span>
        </label>
      ) : (
        <div
          className={cn(
            'origin-top transition-[opacity,scale] duration-(--duration-base) ease-out motion-reduce:duration-100',
            mounted && 'starting:opacity-0',
            removing && 'opacity-0 duration-160 ease-in motion-safe:scale-y-95 motion-reduce:duration-100',
          )}
        >
          <FileRow
            tone={view === 'error' ? 'error' : view === 'complete' ? 'positive' : 'default'}
            fileName={failure?.fileName ?? value?.name ?? ''}
            percent={view === 'uploading' && progress ? uploadPercent(progress.loaded, progress.total) : undefined}
            caption={
              view === 'error'
                ? failure?.message
                : view === 'uploading' && progress
                  ? formatUploadProgress(progress.loaded, progress.total)
                  : view === 'complete'
                    ? ['Uploaded', value?.size !== undefined && formatFileSize(value.size)].filter(Boolean).join(' · ')
                    : value?.size !== undefined
                      ? formatFileSize(value.size)
                      : undefined
            }
            icon={
              <span
                key={view}
                className={cn(
                  iconSwap,
                  mounted && iconEnter,
                  mounted && (view === 'complete' || view === 'error') && iconPop,
                )}
              >
                {view === 'uploading' ? (
                  // The only thing that keeps moving while the upload runs
                  <AnimatedIcon
                    name="upload"
                    size={20}
                    interaction="loop"
                    className="text-text-primary"
                    render={(_, icon) => <>{icon}</>}
                  />
                ) : view === 'complete' ? (
                  <AnimatedIcon
                    name="check-circle"
                    size={20}
                    autoplay
                    speed={CHECK_SPEED}
                    className="text-tone-positive-accent"
                    render={(_, icon) => <>{icon}</>}
                  />
                ) : view === 'error' ? (
                  <Icon name="alert-circle" size={20} className="text-feedback-error-strong" />
                ) : (
                  <Icon name="file-text" size={20} className="text-text-primary" />
                )}
              </span>
            }
            actionLabel={
              view === 'uploading'
                ? onCancel && `Cancel uploading ${value?.name}`
                : `Remove ${failure?.fileName ?? value?.name}`
            }
            onAction={handleAction}
            actionRef={actionRef}
          />
        </div>
      )}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}
