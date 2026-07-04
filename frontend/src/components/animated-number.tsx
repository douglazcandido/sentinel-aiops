import { useEffect, useRef, useState } from "react"

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

interface AnimatedNumberProps {
  /** Target numeric value. Animates from the previously rendered value (or 0 on first mount). */
  value: number
  /** Formats the in-flight numeric value for display (e.g. formatInt, formatPct). */
  format: (n: number) => string
  duration?: number
}

/** Counts up (or down) toward `value` whenever it changes, easing out for a smooth, unflashy finish. */
export function AnimatedNumber({ value, format, duration = 850 }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0)
  const displayRef = useRef(0)
  const frameRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!Number.isFinite(value)) {
      setDisplay(value)
      return
    }
    if (prefersReducedMotion()) {
      displayRef.current = value
      setDisplay(value)
      return
    }

    const from = displayRef.current
    const start = performance.now()
    cancelAnimationFrame(frameRef.current!)

    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration)
      const next = from + (value - from) * easeOutCubic(t)
      displayRef.current = next
      setDisplay(next)
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick)
      }
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current!)
  }, [value, duration])

  return <>{format(display)}</>
}
