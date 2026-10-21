export class SaveQueue<T> {
  private pendingValue: T | undefined
  private timer: ReturnType<typeof setTimeout> | null = null
  private active: Promise<void> | null = null
  private disposed = false

  constructor(
    private save: (value: T) => Promise<void>,
    private onError?: (error: unknown) => void,
    private onBusyChange?: (busy: boolean) => void,
    private onPendingChange?: (pending: boolean) => void,
    private intervalMs = 120_000,
  ) {}

  enqueue(value: T) {
    if (this.disposed) return
    this.pendingValue = value
    this.onPendingChange?.(true)
    if (!this.timer && !this.active) this.schedule()
  }

  async flush(value?: T): Promise<void> {
    if (value !== undefined) {
      this.pendingValue = value
      this.onPendingChange?.(true)
    }
    this.clearTimer()

    if (this.active) {
      await this.active.catch(() => undefined)
      return this.flush()
    }
    if (this.pendingValue === undefined) return

    const next = this.pendingValue
    this.pendingValue = undefined
    this.onPendingChange?.(false)
    this.onBusyChange?.(true)
    const operation = this.save(next)
    this.active = operation
    try {
      await operation
    } catch (error) {
      this.onError?.(error)
      throw error
    } finally {
      this.active = null
      this.onBusyChange?.(false)
      if (this.pendingValue !== undefined && !this.disposed) {
        this.onPendingChange?.(true)
        this.schedule()
      }
    }
  }

  dispose() {
    this.disposed = true
    this.clearTimer()
  }

  private schedule() {
    if (this.timer || this.disposed) return
    this.timer = setTimeout(() => {
      this.timer = null
      void this.flush().catch(() => undefined)
    }, this.intervalMs)
  }

  private clearTimer() {
    if (!this.timer) return
    clearTimeout(this.timer)
    this.timer = null
  }
}
