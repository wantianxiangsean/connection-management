import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'

export function useContactTreeDrag(
  onMove: (contactId: string, managerId: string | null) => void,
) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [overPool, setOverPool] = useState(false)
  const draggingRef = useRef<string | null>(null)
  const overRef = useRef<string | null>(null)
  const overPoolRef = useRef(false)
  const blockedRef = useRef<Set<string>>(new Set())
  const onMoveRef = useRef(onMove)
  onMoveRef.current = onMove

  const startDrag = useCallback(
    (
      event: ReactPointerEvent,
      contactId: string,
      blockedIds: Set<string>,
    ) => {
      event.preventDefault()
      event.stopPropagation()
      draggingRef.current = contactId
      blockedRef.current = blockedIds
      overRef.current = null
      overPoolRef.current = false
      setDraggingId(contactId)
      setOverId(null)
      setOverPool(false)

      const handleMove = (moveEvent: PointerEvent) => {
        const target = document.elementFromPoint(
          moveEvent.clientX,
          moveEvent.clientY,
        )
        const node = target?.closest('[data-contact-id]')
        const candidate = node?.getAttribute('data-contact-id') ?? null
        const over =
          candidate &&
          candidate !== contactId &&
          !blockedRef.current.has(candidate)
            ? candidate
            : null

        if (over) {
          if (overPoolRef.current) {
            overPoolRef.current = false
            setOverPool(false)
          }
          if (over !== overRef.current) {
            overRef.current = over
            setOverId(over)
          }
          return
        }

        if (
          target?.closest('[data-contact-pool-drop]') &&
          !candidate
        ) {
          if (!overPoolRef.current) {
            overPoolRef.current = true
            setOverPool(true)
          }
          if (overRef.current) {
            overRef.current = null
            setOverId(null)
          }
          return
        }

        if (overPoolRef.current) {
          overPoolRef.current = false
          setOverPool(false)
        }
        if (overRef.current) {
          overRef.current = null
          setOverId(null)
        }
      }

      const finish = () => {
        document.removeEventListener('pointermove', handleMove)
        document.removeEventListener('pointerup', finish)
        document.removeEventListener('pointercancel', finish)
        const from = draggingRef.current
        const to = overRef.current
        const pool = overPoolRef.current
        draggingRef.current = null
        overRef.current = null
        overPoolRef.current = false
        setDraggingId(null)
        setOverId(null)
        setOverPool(false)
        if (!from) return
        if (pool) {
          onMoveRef.current(from, null)
          return
        }
        if (to) onMoveRef.current(from, to)
      }

      document.addEventListener('pointermove', handleMove)
      document.addEventListener('pointerup', finish)
      document.addEventListener('pointercancel', finish)
    },
    [],
  )

  return { draggingId, overId, overPool, startDrag }
}
