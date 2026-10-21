import { afterEach, describe, expect, it, vi } from 'vitest'
import { SaveQueue } from './save-queue'

describe('snapshot save queue', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('batches edits and saves only the latest snapshot after two minutes', async () => {
    vi.useFakeTimers()
    const save = vi.fn<(value: string) => Promise<void>>().mockResolvedValue()
    const queue = new SaveQueue(save, undefined, undefined, undefined, 120_000)

    queue.enqueue('first')
    queue.enqueue('second')
    queue.enqueue('latest')

    expect(save).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(119_999)
    expect(save).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)

    expect(save).toHaveBeenCalledOnce()
    expect(save).toHaveBeenCalledWith('latest')
    queue.dispose()
  })

  it('saves pending edits immediately when a manual flush is requested', async () => {
    vi.useFakeTimers()
    const save = vi.fn<(value: string) => Promise<void>>().mockResolvedValue()
    const queue = new SaveQueue(save, undefined, undefined, undefined, 120_000)

    queue.enqueue('pending')
    await queue.flush('manual')

    expect(save).toHaveBeenCalledOnce()
    expect(save).toHaveBeenCalledWith('manual')
    queue.dispose()
  })
})
