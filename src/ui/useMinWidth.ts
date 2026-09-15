import { useLayoutEffect, useState, type RefObject } from 'react'
import { useSyncExternalStore } from 'react'

export const SPLIT_MIN_WIDTH = 1280

function subscribeMinWidth(px: number, onStoreChange: () => void) {
  const media = window.matchMedia(`(min-width: ${px}px)`)
  media.addEventListener('change', onStoreChange)
  return () => media.removeEventListener('change', onStoreChange)
}

function isWindowMinWidth(px: number) {
  if (typeof window === 'undefined') return true
  return window.matchMedia(`(min-width: ${px}px)`).matches
}

export function useMinWidth(px: number) {
  return useSyncExternalStore(
    (onStoreChange) => subscribeMinWidth(px, onStoreChange),
    () => isWindowMinWidth(px),
    () => isWindowMinWidth(px),
  )
}

export function useContainerMinWidth(
  ref: RefObject<HTMLElement | null>,
  px: number,
) {
  const windowWide = useMinWidth(px)
  const [wide, setWide] = useState(windowWide)

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return

    const update = () => {
      setWide(node.clientWidth >= px)
    }
    update()

    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [px, ref])

  return wide
}
