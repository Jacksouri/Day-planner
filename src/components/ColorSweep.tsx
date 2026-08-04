import type { Sweep } from '../lib/useSweep'

/** The expanding circle of the new person's colour that covers the recolouring UI. */
export function ColorSweep({ sweep, onDone }: { sweep: Sweep; onDone(): void }) {
  return (
    <div
      key={sweep.id}
      className={`sweep sweep-${sweep.owner}`}
      data-testid="color-sweep"
      aria-hidden="true"
      style={{ '--sweep-x': `${sweep.x}px`, '--sweep-y': `${sweep.y}px` } as React.CSSProperties}
      onAnimationEnd={onDone}
    />
  )
}
