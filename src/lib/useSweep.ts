import { useEffect, useState } from 'react'
import type { Owner } from './types'

export interface Sweep {
  /** Changes on every switch, so React restarts the animation instead of reusing the element. */
  id: number
  owner: Owner
  x: number
  y: number
}

export interface SweepControls {
  sweep: Sweep | null
  start(owner: Owner, from: { x: number; y: number }): void
  clear(): void
}

/** Drives the colour wipe from the tapped tab; `sweep` is null while nothing is animating. */
export function useSweep(): SweepControls {
  const [sweep, setSweep] = useState<Sweep | null>(null)

  useEffect(() => {
    if (!sweep) return
    // Cleared on a timer as well as on animationend, which never fires in a hidden tab.
    const timer = setTimeout(() => setSweep(null), 700)
    return () => clearTimeout(timer)
  }, [sweep])

  return {
    sweep,
    start: (owner, from) => setSweep((current) => ({ id: (current?.id ?? 0) + 1, owner, ...from })),
    clear: () => setSweep(null),
  }
}
