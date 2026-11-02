import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { AnimatedIcon } from '../AnimatedIcon/AnimatedIcon'
import { buttonVariants } from '../Button/Button.variants'
import type { PageHeaderProps } from './PageHeader.types'
import { pageHeaderVariants } from './PageHeader.variants'

export function PageHeader({ className, appearance, title, description, back, actions, ...props }: PageHeaderProps) {
  return (
    <header
      className={cn(
        pageHeaderVariants({ appearance }),
        // Below md the link's own 12px above its text is enough: 12px more puts the text 24px
        // under the top bar, as far as the title is below it
        back && 'max-md:pt-3',
        className,
      )}
      {...props}
    >
      {back && (
        <AnimatedIcon<HTMLAnchorElement>
          name="arrow-left"
          size={20}
          render={(handlers, icon) => (
            // A ghost Button as a link. Figma has no left padding so the arrow lines up with the
            // title; a negative margin keeps that alignment and gives the hover fill room. Below
            // md it's 8px, not 16, so the fill stops short of the screen edge.
            <Link
              to={back.to}
              className={cn(buttonVariants({ variant: 'ghost' }), '-ml-2 pl-2 md:-ml-4 md:pl-4')}
              {...handlers}
            >
              {icon}
              {back.label}
            </Link>
          )}
        />
      )}
      {/*
        From md the actions sit beside the title and description, bottom-aligned. Below md the
        title takes the full width, so the actions don't squeeze it into wrapping, and the actions
        sit beside the description instead (under the title when there's no description).
      */}
      <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-end gap-x-4 gap-y-1.5 break-words md:gap-x-6">
        <h1
          className={cn(
            'col-start-1 row-start-1 font-display text-heading-h2 text-text-primary md:text-heading-h1',
            actions ? 'max-md:col-span-2' : 'col-span-2',
          )}
        >
          {title}
        </h1>
        {/*
          The description line is always there, empty and hidden when there's none, so headers
          are the same height from page to page and nothing below shifts when you switch
        */}
        {description ? (
          <p className="col-start-1 row-start-2 text-body-base text-text-muted">{description}</p>
        ) : (
          <p aria-hidden className="invisible col-start-1 row-start-2 text-body-base">
            {' '}
          </p>
        )}
        {actions && (
          <div className="col-start-2 row-start-2 flex flex-wrap items-center justify-end gap-3 md:row-span-2 md:row-start-1">
            {actions}
          </div>
        )}
      </div>
    </header>
  )
}
