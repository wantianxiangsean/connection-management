import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'

export function useDragOrder(onReorder: (orderedIds: string[]) => void) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const draggingRef = useRef<string | null>(null)
  const overRef = useRef<string | null>(null)
  const idsRef = useRef<string[]>([])
  const onReorderRef = useRef(onReorder)
  onReorderRef.current = onReorder

  const startDrag = useCallback(
    (
      event: ReactPointerEvent,
      itemId: string,
      orderedIds: string[],
    ) => {
      event.preventDefault()
      event.stopPropagation()
      draggingRef.current = itemId
      overRef.current = itemId
      idsRef.current = orderedIds
      setDraggingId(itemId)
      setOverId(itemId)

      const handleMove = (moveEvent: PointerEvent) => {
        const target = document.elementFromPoint(
          moveEvent.clientX,
          moveEvent.clientY,
        )
        const row = target?.closest('[data-drag-id]')
        const over = row?.getAttribute('data-drag-id') ?? null
        if (over && over !== overRef.current) {
          overRef.current = over
          setOverId(over)
        }
      }

      const finish = () => {
        document.removeEventListener('pointermove', handleMove)
        document.removeEventListener('pointerup', finish)
        document.removeEventListener('pointercancel', finish)
        const from = draggingRef.current
        const to = overRef.current
        draggingRef.current = null
        overRef.current = null
        setDraggingId(null)
        setOverId(null)
        if (!from || !to || from === to) return
        const current = idsRef.current
        const fromIndex = current.indexOf(from)
        const toIndex = current.indexOf(to)
        if (fromIndex < 0 || toIndex < 0) return
        const next = current.filter((value) => value !== from)
        next.splice(toIndex, 0, from)
        onReorderRef.current(next)
      }

      document.addEventListener('pointermove', handleMove)
      document.addEventListener('pointerup', finish)
      document.addEventListener('pointercancel', finish)
    },
    [],
  )

  return { draggingId, overId, startDrag }
}
