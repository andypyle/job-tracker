// Layout pieces for the Foundations documentation pages (Storybook only)
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function Page({ title, description, children }: { title: string; description: ReactNode; children: ReactNode }) {
  return (
    <article className="flex max-w-6xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-heading-h1">{title}</h1>
        <p className="max-w-3xl text-body-base text-text-muted">{description}</p>
      </header>
      {children}
    </article>
  )
}

export function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <h2 className="font-display text-heading-h3">{title}</h2>
      {children}
    </section>
  )
}

/** Light and dark side by side. color-scheme on each panel switches every light-dark() token inside it. */
export function ModePanels({ children }: { children: (mode: 'light' | 'dark') => ReactNode }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {(['light', 'dark'] as const).map((mode) => (
        <div
          key={mode}
          style={{ colorScheme: mode }}
          className="flex flex-col gap-6 rounded-md border border-border-subtle bg-bg-canvas p-6 text-text-primary"
        >
          <h2 className="font-display text-heading-h3">{mode === 'light' ? 'Light mode' : 'Dark mode'}</h2>
          {children(mode)}
        </div>
      ))}
    </div>
  )
}

export function Swatch({ cssVar, label, detail }: { cssVar: string; label: string; detail?: string }) {
  return (
    <figure className="flex w-28 flex-col gap-1.5">
      <div
        className="h-12 rounded-sm border border-border-subtle"
        style={{ background: `var(${cssVar})` }}
      />
      <figcaption className="flex flex-col">
        <span className="text-caption-medium">{label}</span>
        {detail && <span className="text-caption-regular text-text-muted">{detail}</span>}
      </figcaption>
    </figure>
  )
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-xs bg-bg-subtle px-1 py-0.5 whitespace-nowrap font-mono text-caption-regular text-text-primary">
      {children}
    </code>
  )
}
