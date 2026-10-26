import { act, renderHook } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useDragOrder } from './useDragOrder'

let elementAtPoint: Element | null = null

beforeAll(() => {
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value: () => elementAtPoint,
  })
})

function pointerEvent() {
  return {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as ReactPointerEvent
}

describe('useDragOrder', () => {
  it('moves the dragged item to the hovered position', () => {
    const onReorder = vi.fn()
    const { result } = renderHook(() => useDragOrder(onReorder))
    const target = document.createElement('li')
    target.setAttribute('data-drag-id', 'b')
    elementAtPoint = target

    act(() => {
      result.current.startDrag(pointerEvent(), 'a', ['a', 'b', 'c'])
    })
    act(() => {
      document.dispatchEvent(new MouseEvent('pointermove'))
    })
    act(() => {
      document.dispatchEvent(new MouseEvent('pointerup'))
    })

    expect(onReorder).toHaveBeenCalledWith(['b', 'a', 'c'])
    expect(result.current.draggingId).toBeNull()
  })

  it('ignores a drag that ends where it started', () => {
    const onReorder = vi.fn()
    elementAtPoint = null
    const { result } = renderHook(() => useDragOrder(onReorder))

    act(() => {
      result.current.startDrag(pointerEvent(), 'a', ['a', 'b'])
    })
    act(() => {
      document.dispatchEvent(new MouseEvent('pointerup'))
    })

    expect(onReorder).not.toHaveBeenCalled()
    expect(result.current.overId).toBeNull()
  })
})
