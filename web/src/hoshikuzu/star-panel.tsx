import * as React from 'react';
import { cn } from 'cn';

/**
 * The signature surface: a mapped-object panel annotating something on the
 * sky (a selected star, a chart point, a map pin). Compact, hairline-framed,
 * with an optional connector line that points back at the object.
 */
function StarPanel({
  className,
  connector = 'none',
  translucent = false,
  children,
  ...props
}: React.ComponentProps<'article'> & {
  /** Draws a hairline pointer leaving the panel toward its object. */
  connector?: 'none' | 'left' | 'right';
  /** Lets a moving starfield show through. Only use over a starfield. */
  translucent?: boolean;
}) {
  return (
    <article
      data-slot="star-panel"
      data-connector={connector}
      className={cn(
        'relative w-full max-w-72 rounded-sm border border-border px-4 py-3 text-card-foreground shadow-panel',
        translucent ? 'bg-card/80 backdrop-blur-md' : 'bg-card',
        className,
      )}
      {...props}
    >
      {connector !== 'none' && (
        <span
          aria-hidden
          data-slot="star-panel-connector"
          className={cn(
            'pointer-events-none absolute top-5 flex w-10 items-center',
            connector === 'left' ? 'right-full flex-row' : 'left-full flex-row-reverse',
          )}
        >
          <span className="size-[5px] shrink-0 rounded-full bg-current text-signal shadow-glow" />
          <span className="h-px flex-1 bg-border-strong" />
        </span>
      )}
      {children}
    </article>
  );
}

function StarPanelLabel({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="star-panel-label"
      className={cn(
        'text-2xs leading-[1.2] font-semibold tracking-[0.22em] text-faint-foreground uppercase',
        className,
      )}
      {...props}
    />
  );
}

function StarPanelTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return (
    <h3
      data-slot="star-panel-title"
      className={cn(
        'mt-1 text-sm leading-tight font-semibold tracking-[0.14em] text-foreground uppercase',
        className,
      )}
      {...props}
    />
  );
}

function StarPanelDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="star-panel-description"
      className={cn('mt-3 text-xs leading-relaxed text-muted-foreground', className)}
      {...props}
    />
  );
}

/** Key/value readouts in mono, separated by a hairline. */
function StarPanelMeta({ className, ...props }: React.ComponentProps<'dl'>) {
  return (
    <dl
      data-slot="star-panel-meta"
      className={cn(
        'mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-border pt-3 text-[0.6875rem] *:[dd]:truncate *:[dd]:text-right *:[dd]:font-mono *:[dd]:text-muted-foreground *:[dt]:font-semibold *:[dt]:tracking-[0.12em] *:[dt]:text-faint-foreground *:[dt]:uppercase',
        className,
      )}
      {...props}
    />
  );
}

function StarPanelActions({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="star-panel-actions"
      className={cn('mt-4 flex items-center gap-2', className)}
      {...props}
    />
  );
}

export {
  StarPanel,
  StarPanelActions,
  StarPanelDescription,
  StarPanelLabel,
  StarPanelMeta,
  StarPanelTitle,
};
