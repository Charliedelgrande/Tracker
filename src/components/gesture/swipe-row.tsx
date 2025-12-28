import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  children: ReactNode
  onDelete: () => void | Promise<void>
  className?: string
  deleteLabel?: string
  deleteWidthPx?: number
}

/**
 * Mobile-first "swipe left to reveal Delete", iOS-style.
 * - No always-visible delete buttons
 * - Swipe left to reveal a red action, then tap Delete
 */
export function SwipeRow({
  children,
  onDelete,
  className,
  deleteLabel = 'Delete',
  deleteWidthPx = 96,
}: Props) {
  const rowId = useId()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const dxRef = useRef(0)
  const openRef = useRef(false)
  const [dx, setDx] = useState(0)
  const [, setOpen] = useState(false)
  const [dragging, setDragging] = useState(false)

  const maxLeft = useMemo(() => -deleteWidthPx, [deleteWidthPx])

  useEffect(() => {
    function onOtherOpen(e: Event) {
      const ev = e as CustomEvent<{ id: string }>
      if (ev.detail?.id !== rowId) {
        setOpen(false)
        setDx(0)
      }
    }
    window.addEventListener('trackos-swipe-open', onOtherOpen as EventListener)
    return () => window.removeEventListener('trackos-swipe-open', onOtherOpen as EventListener)
  }, [rowId])

  function clamp(n: number) {
    return Math.max(maxLeft, Math.min(0, n))
  }

  function setDxBoth(next: number) {
    dxRef.current = next
    setDx(next)
  }

  function setOpenBoth(next: boolean) {
    openRef.current = next
    setOpen(next)
  }

  function settle(nextDx: number) {
    // If user swipes far enough, delete immediately (iOS-like full swipe).
    const shouldDelete = nextDx <= maxLeft * 0.95
    if (shouldDelete) {
      void Promise.resolve(onDelete()).finally(() => {
        setOpenBoth(false)
        setDxBoth(0)
      })
      return
    }

    const shouldOpen = nextDx < maxLeft / 2
    setOpenBoth(shouldOpen)
    setDxBoth(shouldOpen ? maxLeft : 0)
    if (shouldOpen) {
      window.dispatchEvent(new CustomEvent('trackos-swipe-open', { detail: { id: rowId } }))
    }
  }

  function isInteractiveTarget(target: EventTarget | null) {
    if (!(target instanceof Element)) return false
    // Allow swipe to start on most row content (including buttons/links) so it feels iOS-like.
    // Only block for form controls where horizontal drag would be annoying.
    return Boolean(target.closest('input, textarea, select'))
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden rounded-md border border-border bg-background', className)}
    >
      {/* Underlay action */}
      <div
        className="absolute inset-y-0 right-0 z-0 flex items-center justify-end bg-red-600 px-3 pointer-events-auto"
        style={{ width: deleteWidthPx }}
      >
        <button
          type="button"
          className="flex h-full w-full select-none items-center justify-center gap-2 text-sm font-semibold text-white"
          onClick={async (e) => {
            e.stopPropagation()
            await onDelete()
            setOpenBoth(false)
            setDxBoth(0)
          }}
        >
          <Trash2 className="h-4 w-4" />
          {deleteLabel}
        </button>
      </div>

      {/* Foreground content */}
      <div
        className={cn(
          // Important: give the foreground an opaque bg so the red underlay never "bleeds" through.
          'relative z-10 bg-background will-change-transform [transform:translateZ(0)]',
          dragging ? 'transition-none' : 'transition-transform duration-200',
        )}
        style={{ transform: `translateX(${dx}px)`, touchAction: 'pan-y' }}
        onClickCapture={(e) => {
          // If a swipe gesture occurred, suppress the underlying row click/navigation.
          if (dragging) return
          // Use dxRef (not state) to avoid stale timing.
          if (Math.abs(dxRef.current) > 6) {
            e.preventDefault()
            e.stopPropagation()
          }
        }}
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return
          if (isInteractiveTarget(e.target)) return
          startRef.current = { x: e.clientX, y: e.clientY, t: Date.now() }
          setDragging(true)
          ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          const start = startRef.current
          if (!start) return
          const deltaX = e.clientX - start.x
          const deltaY = e.clientY - start.y
          // Only engage swipe after a real horizontal intent.
          if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) return
          // If user is clearly scrolling vertically, bail out.
          if (Math.abs(deltaY) > Math.abs(deltaX) + 8) return
          // Prevent accidental page scroll when swiping horizontally.
          e.preventDefault()
          const base = openRef.current ? maxLeft : 0
          setDxBoth(clamp(base + deltaX))
        }}
        onPointerUp={(e) => {
          const start = startRef.current
          startRef.current = null
          setDragging(false)
          ;(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
          if (!start) return
          const movedX = e.clientX - start.x
          const movedY = e.clientY - start.y
          // Tap to close if currently open.
          if (openRef.current && Math.abs(movedX) < 8 && Math.abs(movedY) < 8) {
            setOpenBoth(false)
            setDxBoth(0)
            return
          }
          settle(dxRef.current)
        }}
        onPointerCancel={(e) => {
          startRef.current = null
          setDragging(false)
          try {
            ;(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
          } catch {
            // ignore
          }
          setDxBoth(openRef.current ? maxLeft : 0)
        }}
      >
        {children}
      </div>
    </div>
  )
}


