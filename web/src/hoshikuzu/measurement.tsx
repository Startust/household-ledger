import * as React from 'react';
import { cn } from 'cn';

/**
 * A reading taken from an instrument: light numerals, a tracked label, an
 * optional icon. Reads as a measurement in an atlas, not a SaaS hero metric.
 */
function Measurement({
  className,
  tone = 'default',
  ...props
}: React.ComponentProps<'div'> & {
  /** Tints the icon only. The number stays in foreground ink. */
  tone?: 'default' | 'signal' | 'success' | 'warning' | 'destructive';
}) {
  return (
    <div
      data-slot="measurement"
      data-tone={tone}
      className={cn(
        'group/measurement grid min-h-28 content-end gap-2 p-4 text-foreground',
        className,
      )}
      {...props}
    />
  );
}

function MeasurementIcon({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="measurement-icon"
      aria-hidden
      className={cn(
        "mb-auto inline-flex text-faint-foreground group-data-[tone=destructive]/measurement:text-destructive group-data-[tone=signal]/measurement:text-signal group-data-[tone=success]/measurement:text-success group-data-[tone=warning]/measurement:text-warning [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function MeasurementValue({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="measurement-value"
      className={cn(
        'flex items-baseline gap-1.5 text-3xl leading-none font-light tabular-nums',
        className,
      )}
      {...props}
    />
  );
}

function MeasurementUnit({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="measurement-unit"
      className={cn(
        'text-2xs font-semibold tracking-[0.14em] text-faint-foreground uppercase',
        className,
      )}
      {...props}
    />
  );
}

function MeasurementLabel({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="measurement-label"
      className={cn(
        'text-2xs leading-[1.2] font-semibold tracking-[0.16em] text-muted-foreground uppercase',
        className,
      )}
      {...props}
    />
  );
}

function MeasurementNote({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="measurement-note"
      className={cn('text-xs text-faint-foreground', className)}
      {...props}
    />
  );
}

/**
 * Lays measurements out on a hairline grid: the gaps are the rules, so no
 * cell carries its own border.
 */
function MeasurementGrid({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="measurement-grid"
      className={cn(
        'grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-border bg-border *:data-[slot=measurement]:bg-card sm:grid-cols-4',
        className,
      )}
      {...props}
    />
  );
}

export {
  Measurement,
  MeasurementGrid,
  MeasurementIcon,
  MeasurementLabel,
  MeasurementNote,
  MeasurementUnit,
  MeasurementValue,
};
