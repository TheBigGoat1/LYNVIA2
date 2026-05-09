"use client"

import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
 * Mobile-first default avoids a first paint where the desktop sidebar branch is used
 * while the layout is still `hidden md:block` on narrow viewports (invisible nav until hydration).
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(true)

  React.useLayoutEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const sync = () => setIsMobile(mql.matches)
    sync()
    mql.addEventListener("change", sync)
    return () => mql.removeEventListener("change", sync)
  }, [])

  return isMobile
}
