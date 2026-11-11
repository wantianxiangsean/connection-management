import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { emptySnapshot } from '../domain/workspace'
import { CloudflareRepository } from './cloudflare-repository'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('cloudflare repository', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads the workspace from the worker and caches it', async () => {
    const snapshot = {
      ...emptySnapshot(),
      clients: [
        {
          id: 'client-1',
          name: '青禾科技',
          address: '',
          categories: ['customer' as const],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    }
    const fetcher = vi.fn(async () => jsonResponse(snapshot))
    const repository = new CloudflareRepository({
      storage: localStorage,
      key: 'cloudflare-test',
      fetcher,
    })

    await expect(repository.load()).resolves.toEqual(snapshot)
    expect(fetcher).toHaveBeenCalledWith(
      '/api/workspace',
      expect.objectContaining({ cache: 'no-store' }),
    )
    expect(JSON.parse(localStorage.getItem('cloudflare-test')!)).toEqual(
      snapshot,
    )
    expect(repository.hasPendingCloud()).toBe(false)
  })

  it('starts with an empty snapshot when the cloud has no workspace yet', async () => {
    const repository = new CloudflareRepository({
      storage: localStorage,
      key: 'cloudflare-test',
      fetcher: vi.fn(async () => jsonResponse({ error: 'not found' }, 404)),
    })

    await expect(repository.load()).resolves.toEqual(emptySnapshot())
  })

  it('saves the snapshot through the worker and clears the pending flag', async () => {
    const snapshot = emptySnapshot()
    const fetcher = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        jsonResponse({ ok: true }),
    )
    const repository = new CloudflareRepository({
      storage: localStorage,
      key: 'cloudflare-test',
      fetcher,
    })
    repository.cache(snapshot)
    expect(repository.hasPendingCloud()).toBe(true)

    await repository.save(snapshot)

    const put = fetcher.mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === 'PUT',
    )
    expect(put).toBeDefined()
    expect((put?.[1] as RequestInit).body).toBe(JSON.stringify(snapshot))
    expect(repository.hasPendingCloud()).toBe(false)
  })

  it('reports an expired session when saving is rejected', async () => {
    const repository = new CloudflareRepository({
      storage: localStorage,
      key: 'cloudflare-test',
      fetcher: vi.fn(async () =>
        jsonResponse({ error: 'unauthorized' }, 401),
      ),
    })

    await expect(repository.save(emptySnapshot())).rejects.toThrow(
      '登录状态已失效',
    )
  })

  it('uploads attachments to the worker and serves them by API path', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).startsWith('/api/attachments/')) {
        return jsonResponse({ ok: true })
      }
      return jsonResponse({ error: 'unexpected' }, 500)
    })
    const repository = new CloudflareRepository({
      storage: localStorage,
      key: 'cloudflare-test',
      fetcher,
    })

    const attachment = await repository.uploadAttachment(
      new File(['hello'], 'note.txt', { type: 'text/plain' }),
      'person-1',
    )

    expect(attachment.storagePath).toMatch(
      /^attachments\/attachment-[0-9a-f-]+\.txt$/,
    )
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/attachments\/attachment-/),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
      }),
    )
    await expect(
      repository.getAttachmentUrl(attachment.storagePath),
    ).resolves.toBe(
      `/api/attachments/${attachment.storagePath.replace('attachments/', '')}`,
    )
  })

  it('leaves embedded data URLs untouched', async () => {
    const repository = new CloudflareRepository({
      storage: localStorage,
      key: 'cloudflare-test',
      fetcher: vi.fn(),
    })

    await expect(
      repository.getAttachmentUrl('data:image/png;base64,abc'),
    ).resolves.toBe('data:image/png;base64,abc')
  })
})
