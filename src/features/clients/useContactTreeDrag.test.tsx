import { act, renderHook } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useContactTreeDrag } from './useContactTreeDrag'

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

function contactNode(id: string) {
  const node = document.createElement('li')
  node.setAttribute('data-contact-id', id)
  return node
}

function poolNode() {
  const node = document.createElement('div')
  node.setAttribute('data-contact-pool-drop', '')
  return node
}

describe('useContactTreeDrag', () => {
  it('reports the hovered contact as the new manager', () => {
    const onMove = vi.fn()
    const { result } = renderHook(() => useContactTreeDrag(onMove))
    elementAtPoint = contactNode('b')

    act(() => {
      result.current.startDrag(pointerEvent(), 'a', new Set())
    })
    act(() => {
      document.dispatchEvent(new MouseEvent('pointermove'))
    })
    act(() => {
      document.dispatchEvent(new MouseEvent('pointerup'))
    })

    expect(onMove).toHaveBeenCalledWith('a', 'b')
    expect(result.current.draggingId).toBeNull()
  })

  it('detaches a contact when it is dropped on the pool', () => {
    const onMove = vi.fn()
    const { result } = renderHook(() => useContactTreeDrag(onMove))
    elementAtPoint = poolNode()

    act(() => {
      result.current.startDrag(pointerEvent(), 'a', new Set())
    })
    act(() => {
      document.dispatchEvent(new MouseEvent('pointermove'))
    })
    expect(result.current.overPool).toBe(true)
    act(() => {
      document.dispatchEvent(new MouseEvent('pointerup'))
    })

    expect(onMove).toHaveBeenCalledWith('a', null)
  })

  it('ignores itself and its own reports as targets', () => {
    const onMove = vi.fn()
    const { result } = renderHook(() => useContactTreeDrag(onMove))
    elementAtPoint = contactNode('child')

    act(() => {
      result.current.startDrag(
        pointerEvent(),
        'a',
        new Set(['child', 'grandchild']),
      )
    })
    act(() => {
      document.dispatchEvent(new MouseEvent('pointermove'))
    })
    act(() => {
      document.dispatchEvent(new MouseEvent('pointerup'))
    })

    expect(onMove).not.toHaveBeenCalled()
    expect(result.current.overId).toBeNull()
  })
})
