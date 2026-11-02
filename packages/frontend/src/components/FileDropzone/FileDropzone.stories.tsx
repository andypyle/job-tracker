import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect, useRef, useState } from 'react'
import { expect, fireEvent, fn, userEvent, waitFor } from 'storybook/test'

import { FormField } from '../FormField/FormField'
import { FileDropzone } from './FileDropzone'
import type { FileDropzoneProps, UploadProgress } from './FileDropzone.types'

const KB = 1024
const MB = 1024 * KB

/** A file with a given size, without allocating it */
function makeFile(name: string, size: number, type = 'application/pdf') {
  const file = new File(['%PDF'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

/** Elements that enter after an interaction fade in, so wait until they're opaque */
const toBecomeVisible = (element: HTMLElement) => waitFor(() => expect(element).toBeVisible())

// Dispatched directly: fireEvent rebuilds the dataTransfer from its own keys, and a real
// DataTransfer keeps its files on the prototype, so they'd arrive empty
function dropOn(target: Element, file: File) {
  const dataTransfer = new DataTransfer()
  dataTransfer.items.add(file)
  target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }))
}

/**
 * The parent's side: keeps the file and fakes an upload in five steps, 120ms apart.
 * `failWith` ends the upload with that error instead.
 */
function UploadDemo({ failWith, ...props }: Partial<FileDropzoneProps> & { failWith?: string }) {
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [error, setError] = useState<string>()
  const timer = useRef<ReturnType<typeof setInterval>>(undefined)
  useEffect(() => () => clearInterval(timer.current), [])

  function start(next: File) {
    setFile(next)
    setError(undefined)
    let loaded = 0
    setProgress({ loaded, total: next.size })
    timer.current = setInterval(() => {
      loaded += next.size / 5
      if (loaded < next.size) return setProgress({ loaded, total: next.size })
      clearInterval(timer.current)
      setProgress(null)
      if (failWith) setError(failWith)
    }, 120)
  }

  return (
    <FileDropzone
      {...props}
      value={file}
      progress={progress}
      error={error}
      onSelect={(next) => {
        props.onSelect?.(next)
        start(next)
      }}
      onCancel={() => {
        clearInterval(timer.current)
        setProgress(null)
        setFile(null)
      }}
      onRemove={() => {
        props.onRemove?.()
        setFile(null)
        setError(undefined)
      }}
    />
  )
}

const meta = {
  title: 'Components/FileDropzone',
  component: FileDropzone,
  tags: ['autodocs'],
  args: {
    onSelect: fn(),
    onRemove: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FileDropzone>

export default meta
type Story = StoryObj<typeof meta>

/** Wired to a fake upload, so picking or dropping a PDF runs the whole flow */
export const Default: Story = {
  render: (args) => <UploadDemo {...args} />,
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText(/Upload PDF or drag it here/)
    await expect(input).toHaveAttribute('type', 'file')
    await expect(input).toHaveAttribute('accept', 'application/pdf')
  },
}

/** Every state but Complete, which only shows for 800ms after an upload (see Upload) */
export const States: Story = {
  render: (args) => (
    <div className="grid w-[calc(3*20rem+2*1rem)] grid-cols-3 gap-4">
      <FileDropzone {...args} />
      <div data-testid="drag-over">
        <FileDropzone {...args} />
      </div>
      <FileDropzone
        {...args}
        value={{ name: 'resume.pdf', size: 182 * KB }}
        progress={{ loaded: 113 * KB, total: 182 * KB }}
        onCancel={fn()}
      />
      <FileDropzone {...args} value={{ name: 'resume.pdf', size: 182 * KB }} />
      <FileDropzone
        {...args}
        value={{ name: 'resume-final-v3.pdf' }}
        error="This file is 14 MB. The limit is 10 MB."
      />
    </div>
  ),
  play: async ({ canvas }) => {
    fireEvent.dragEnter(canvas.getByTestId('drag-over').querySelector('label')!)
    await toBecomeVisible(await canvas.findByText('Drop to upload'))
    await expect(canvas.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '62')
    await expect(canvas.getByText('62% · 113 of 182 KB')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Cancel uploading resume.pdf' })).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Remove resume.pdf' })).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Remove resume-final-v3.pdf' })).toBeVisible()
  },
}

export const StatesDark: Story = {
  ...States,
  globals: { theme: 'dark' },
}

export const DragOver: Story = {
  play: async ({ canvas }) => {
    const zone = canvas.getByText('Upload PDF or drag it here').closest('label')!
    fireEvent.dragEnter(zone)
    await toBecomeVisible(await canvas.findByText('Drop to upload'))
    await expect(getComputedStyle(zone).borderTopWidth).toBe('2px')
    // Moving onto a child keeps the state; leaving the zone ends it
    fireEvent.dragLeave(zone, { relatedTarget: zone.querySelector('svg') })
    await expect(canvas.getByText('Drop to upload')).toBeVisible()
    fireEvent.dragLeave(zone, { relatedTarget: document.body })
    await toBecomeVisible(await canvas.findByText('Upload PDF or drag it here'))
  },
}

export const KeyboardFocus: Story = {
  play: async ({ canvas }) => {
    await userEvent.tab()
    const input = canvas.getByLabelText(/Upload PDF or drag it here/)
    await expect(input).toHaveFocus()
    // The ring is on the zone around the hidden input
    await expect(getComputedStyle(input.closest('label')!).outlineWidth).toBe('2px')
  },
}

/** Pick a file, watch it upload, hold on Complete, settle on the filled row, then remove it */
export const Upload: Story = {
  render: (args) => <UploadDemo {...args} />,
  play: async ({ args, canvas }) => {
    const input = canvas.getByLabelText(/Upload PDF or drag it here/)
    const file = makeFile('resume.pdf', 182 * KB)
    await userEvent.upload(input, file)
    await expect(args.onSelect).toHaveBeenCalledOnce()
    await expect(args.onSelect).toHaveBeenCalledWith(file)

    // Uploading: progress, a cancel button that now has focus, and an announcement
    await toBecomeVisible(canvas.getByRole('progressbar', { name: 'Uploading resume.pdf' }))
    await waitFor(() => expect(canvas.getByText('Uploading resume.pdf')).toBeInTheDocument())
    const action = canvas.getByRole('button', { name: 'Cancel uploading resume.pdf' })
    await waitFor(() => expect(action).toHaveFocus())

    // Complete holds, then the filled row; the same button keeps focus throughout
    await toBecomeVisible(await canvas.findByText('Uploaded · 182 KB'))
    await expect(canvas.getByText('resume.pdf uploaded')).toBeInTheDocument()
    await toBecomeVisible(await canvas.findByText('182 KB', {}, { timeout: 2000 }))
    await expect(action).toHaveAccessibleName('Remove resume.pdf')
    await expect(action).toHaveFocus()

    // Remove: the row fades, then focus returns to the empty zone
    await userEvent.click(action)
    const fresh = await canvas.findByLabelText(/Upload PDF or drag it here/)
    await expect(args.onRemove).toHaveBeenCalledOnce()
    await waitFor(() => expect(fresh).toHaveFocus())
    await expect(canvas.getByText('resume.pdf removed')).toBeInTheDocument()
  },
}

export const CancelUpload: Story = {
  render: (args) => <UploadDemo {...args} />,
  play: async ({ canvas }) => {
    await userEvent.upload(
      canvas.getByLabelText(/Upload PDF or drag it here/),
      makeFile('cover-letter.pdf', 2 * MB),
    )
    await userEvent.click(canvas.getByRole('button', { name: 'Cancel uploading cover-letter.pdf' }))
    const input = await canvas.findByLabelText(/Upload PDF or drag it here/)
    await waitFor(() => expect(input).toHaveFocus())
    await expect(canvas.getByText('Upload of cover-letter.pdf cancelled')).toBeInTheDocument()
  },
}

export const TooLarge: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.upload(
      canvas.getByLabelText(/Upload PDF or drag it here/),
      makeFile('resume-final-v3.pdf', 14 * MB),
    )
    await expect(args.onSelect).not.toHaveBeenCalled()
    await toBecomeVisible(canvas.getByText('This file is 14 MB. The limit is 10 MB.'))
    await expect(
      canvas.getByText('resume-final-v3.pdf: This file is 14 MB. The limit is 10 MB.'),
    ).toBeInTheDocument()
    // Focus moves to the row's button; it clears the error and returns to the zone
    const remove = canvas.getByRole('button', { name: 'Remove resume-final-v3.pdf' })
    await waitFor(() => expect(remove).toHaveFocus())
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(canvas.getByLabelText(/Upload PDF or drag it here/)).toHaveFocus())
    await expect(args.onRemove).not.toHaveBeenCalled()
  },
}

/** Dropping skips the picker's PDF filter, so the type is checked too */
export const WrongType: Story = {
  play: async ({ args, canvas }) => {
    dropOn(
      canvas.getByText('Upload PDF or drag it here').closest('label')!,
      makeFile('resume.docx', 40 * KB, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    )
    await expect(args.onSelect).not.toHaveBeenCalled()
    await toBecomeVisible(await canvas.findByText('This is a .docx file. Upload a PDF instead.'))
  },
}

export const UploadFailed: Story = {
  render: (args) => <UploadDemo {...args} failWith="The upload didn't go through. Try again." />,
  play: async ({ args, canvas }) => {
    await userEvent.upload(
      canvas.getByLabelText(/Upload PDF or drag it here/),
      makeFile('resume.pdf', 182 * KB),
    )
    await toBecomeVisible(await canvas.findByText("The upload didn't go through. Try again."))
    await userEvent.click(canvas.getByRole('button', { name: 'Remove resume.pdf' }))
    await expect(args.onRemove).toHaveBeenCalledOnce()
    await toBecomeVisible(await canvas.findByText('Upload PDF or drag it here'))
  },
}

export const InFormField: Story = {
  render: (args) => (
    <FormField label="Résumé" optional hint="Saved with the application.">
      <FileDropzone {...args} />
    </FormField>
  ),
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText(/Résumé/)
    await expect(input).toHaveAttribute('type', 'file')
    await expect(input).toHaveAccessibleDescription('Saved with the application.')
  },
}

export const FieldError: Story = {
  render: (args) => (
    <FormField label="Résumé" error="Attach your résumé">
      <FileDropzone {...args} />
    </FormField>
  ),
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText(/Résumé/)
    await expect(input).toBeInvalid()
    await expect(input).toHaveAccessibleDescription('Attach your résumé')
  },
}
