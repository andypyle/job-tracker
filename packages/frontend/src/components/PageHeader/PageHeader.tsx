import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { AnimatedIcon } from '../AnimatedIcon/AnimatedIcon'
import { buttonVariants } from '../Button/Button.variants'
import type { PageHeaderProps } from './PageHeader.types'
import { pageHeaderVariants } from './PageHeader.variants'

export function PageHeader({ className, appearance, title, description, back, actions, ...props }: PageHeaderProps) {
  return (
    <header className={cn(pageHeaderVariants({ appearance }), className)} {...props}>
      {back && (
        <AnimatedIcon<HTMLAnchorElement>
          name="arrow-left"
          size={20}
          render={(handlers, icon) => (
            // A ghost Button as a link. Figma has no left padding so the arrow lines up with the
            // title; a negative margin keeps that alignment and gives the hover fill room.
            <Link to={back.to} className={cn(buttonVariants({ variant: 'ghost' }), '-ml-4 pl-4')} {...handlers}>
              {icon}
              {back.label}
            </Link>
          )}
        />
      )}
      <div className="flex w-full flex-col items-start gap-4 md:flex-row md:items-end md:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 break-words">
          <h1 className="font-display text-heading-h2 text-text-primary md:text-heading-h1">{title}</h1>
          {description && <p className="text-body-base text-text-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </header>
  )
}
