export class SaveQueue<T> {
  private tail: Promise<void> = Promise.resolve()
  private pending = 0

  constructor(
    private save: (value: T) => Promise<void>,
    private onError?: (error: unknown) => void,
    private onBusyChange?: (busy: boolean) => void,
  ) {}

  enqueue(value: T) {
    this.pending += 1
    this.onBusyChange?.(true)
    this.tail = this.tail
      .then(() => this.save(value))
      .catch((error) => this.onError?.(error))
      .finally(() => {
        this.pending -= 1
        if (this.pending === 0) this.onBusyChange?.(false)
      })
    return this.tail
  }
}
