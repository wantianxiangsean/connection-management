import { describe, expect, it, vi } from 'vitest'
import { SaveQueue } from './save-queue'

describe('snapshot save queue', () => {
  it('serializes overlapping saves in update order', async () => {
    let releaseFirst: (() => void) | undefined
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    const save = vi
      .fn<(value: string) => Promise<void>>()
      .mockImplementationOnce(() => firstGate)
      .mockResolvedValue(undefined)
    const queue = new SaveQueue(save)

    const first = queue.enqueue('first')
    const second = queue.enqueue('second')
    await Promise.resolve()

    expect(save.mock.calls.map(([value]) => value)).toEqual(['first'])
    releaseFirst!()
    await Promise.all([first, second])
    expect(save.mock.calls.map(([value]) => value)).toEqual(['first', 'second'])
  })
})
