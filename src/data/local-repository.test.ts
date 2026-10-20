import { describe, expect, it } from 'vitest'
import { LocalRepository } from './local-repository'
import { emptySnapshot } from '../domain/workspace'

describe('local repository', () => {
  it('persists a snapshot across repository instances', async () => {
    localStorage.clear()
    const first = new LocalRepository({
      storage: localStorage,
      key: 'connection-test',
      seed: false,
    })
    const snapshot = emptySnapshot()
    snapshot.customFields.push({
      id: 'field-1',
      label: '共同爱好',
      type: 'text',
      options: [],
      displayOrder: 0,
      isActive: true,
    })
    await first.save(snapshot)

    const second = new LocalRepository({
      storage: localStorage,
      key: 'connection-test',
      seed: false,
    })
    expect((await second.load()).customFields[0].label).toBe('共同爱好')
  })
})

