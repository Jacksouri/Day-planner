import { useEffect } from 'react'
import type { Owner } from './types'

/**
 * iOS paints the areas above and below a home-screen web app with `theme-color`, so it has to
 * follow the open tab — otherwise those bars stay the icon's red while the app itself is green.
 */
export const THEME_COLORS: Record<Owner, string> = {
  both: '#10131a',
  jack: '#0d1714',
  parmiss: '#14111d',
}

function themeMeta(): HTMLMetaElement {
  const existing = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (existing) return existing
  const meta = document.createElement('meta')
  meta.name = 'theme-color'
  document.head.append(meta)
  return meta
}

export function useOwnerTheme(owner: Owner): void {
  useEffect(() => {
    if (typeof document === 'undefined') return
    // Set on the root element so the tinted background reaches `body`, outside the app container.
    document.documentElement.dataset.owner = owner
    themeMeta().setAttribute('content', THEME_COLORS[owner])
  }, [owner])
}
