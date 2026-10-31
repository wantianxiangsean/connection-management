import { afterEach, describe, expect, it, vi } from 'vitest'
import { emptySnapshot } from '../domain/workspace'
import { GitHubRepository } from './github-repository'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

describe('github private repository', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('rejects a token without access to the private data repository', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ message: 'Not Found' }, 404)),
    )
    const repository = new GitHubRepository({
      storage: localStorage,
      key: 'github-test',
    })

    await expect(repository.signIn('invalid-token')).rejects.toThrow(
      'Token 无效或无权访问私有数据仓库',
    )
    await expect(repository.getSession()).resolves.toBeNull()
  })

  it('rejects a read-only token that cannot back up contacts', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/user')) {
        return jsonResponse({ login: 'owner' })
      }
      return jsonResponse({
        private: true,
        permissions: { push: false },
      })
    })
    const repository = new GitHubRepository({
      storage: localStorage,
      key: 'github-test',
      fetcher,
    })

    await expect(repository.signIn('read-only-token')).rejects.toThrow(
      '写入权限',
    )
  })

  it('opens with an empty archive when no token is remembered', async () => {
    const repository = new GitHubRepository({
      storage: localStorage,
      key: 'github-test',
    })

    await expect(repository.load()).resolves.toEqual(emptySnapshot())
  })

  it('caches edits locally before the scheduled cloud save', () => {
    const repository = new GitHubRepository({
      storage: localStorage,
      key: 'github-test',
    })
    const snapshot = {
      ...emptySnapshot(),
      goals: [
        {
          id: 'goal-cache',
          personId: 'person-1',
          title: '本地缓存',
          status: 'active' as const,
          targetDate: null,
        },
      ],
    }

    repository.cache(snapshot)

    expect(localStorage.getItem('github-test')).toBe(JSON.stringify(snapshot))
  })

  it('keeps unsynced local edits when the page is reopened', async () => {
    const cloud = emptySnapshot()
    const local = {
      ...emptySnapshot(),
      goals: [
        {
          id: 'goal-local',
          personId: 'person-1',
          title: '尚未同步',
          status: 'active' as const,
          targetDate: null,
        },
      ],
    }
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/user')) return jsonResponse({ login: 'owner' })
      if (url.includes('/contents/workspace.json')) {
        return jsonResponse({
          sha: 'sha-cloud',
          content: encodeBase64(JSON.stringify(cloud)),
          encoding: 'base64',
        })
      }
      return jsonResponse({ private: true, permissions: { push: true } })
    })
    const repository = new GitHubRepository({
      storage: localStorage,
      key: 'github-test',
      fetcher,
    })
    await repository.signIn('valid-token')
    repository.cache(local)

    await expect(repository.load()).resolves.toEqual(local)
  })

  it('can explicitly restore the cloud version over unsynced local edits', async () => {
    const cloud = emptySnapshot()
    const local = {
      ...emptySnapshot(),
      goals: [
        {
          id: 'goal-local',
          personId: 'person-1',
          title: '尚未同步',
          status: 'active' as const,
          targetDate: null,
        },
      ],
    }
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/user')) return jsonResponse({ login: 'owner' })
      if (url.includes('/contents/workspace.json')) {
        return jsonResponse({
          sha: 'sha-cloud',
          content: encodeBase64(JSON.stringify(cloud)),
          encoding: 'base64',
        })
      }
      return jsonResponse({ private: true, permissions: { push: true } })
    })
    const repository = new GitHubRepository({
      storage: localStorage,
      key: 'github-test',
      fetcher,
    })
    await repository.signIn('valid-token')
    repository.cache(local)

    await expect(repository.load(true)).resolves.toEqual(cloud)
  })

  it('does not report a cached restore when the cloud read fails', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/user')) return jsonResponse({ login: 'owner' })
      if (url.includes('/contents/workspace.json')) {
        return jsonResponse({ message: 'temporary failure' }, 503)
      }
      return jsonResponse({ private: true, permissions: { push: true } })
    })
    const repository = new GitHubRepository({
      storage: localStorage,
      key: 'github-test',
      fetcher,
    })
    await repository.signIn('valid-token')
    repository.cache(emptySnapshot())

    await expect(repository.load(true)).rejects.toThrow('云端档案读取失败')
  })

  it('loads the private cloud workspace after validating the token', async () => {
    const snapshot = emptySnapshot()
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/user')) return jsonResponse({ login: 'owner' })
      if (url.includes('/contents/workspace.json')) {
        return jsonResponse({
          content: btoa(JSON.stringify(snapshot)),
        })
      }
      return jsonResponse({ private: true, permissions: { push: true } })
    })
    vi.stubGlobal('fetch', fetchMock)
    const repository = new GitHubRepository({
      storage: localStorage,
      key: 'github-test',
    })

    await repository.signIn('valid-token')

    await expect(repository.getSession()).resolves.toMatchObject({
      id: 'owner',
      phone: 'owner',
    })
    await expect(repository.load()).resolves.toEqual(snapshot)
    expect(fetchMock).toHaveBeenCalled()
  })

  it('writes workspace changes to the private repository', async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/user')) return jsonResponse({ login: 'owner' })
        if (init?.method === 'PUT') return jsonResponse({ content: { sha: 'new' } })
        if (url.includes('/contents/workspace.json')) {
          return jsonResponse({ message: 'Not Found' }, 404)
        }
        return jsonResponse({ private: true, permissions: { push: true } })
      },
    )
    vi.stubGlobal('fetch', fetchMock)
    const repository = new GitHubRepository({
      storage: localStorage,
      key: 'github-test',
    })
    await repository.signIn('valid-token')

    await repository.save(emptySnapshot())

    const putCall = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'PUT',
    )
    expect(putCall).toBeDefined()
    expect(String((putCall?.[1]?.headers as Headers).get('Authorization'))).toBe(
      'Bearer valid-token',
    )
    expect(putCall?.[1]?.body).toContain('"message":"同步见微人脉档案"')
  })

  it('reports the GitHub status when a write is rejected', async () => {
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/user')) return jsonResponse({ login: 'owner' })
        if (!url.includes('/contents/workspace.json')) {
          return jsonResponse({
            private: true,
            permissions: { push: true },
          })
        }
        if (init?.method === 'PUT') {
          return jsonResponse(
            { message: 'Resource not accessible by personal access token' },
            403,
          )
        }
        return jsonResponse({ sha: 'sha-0' })
      },
    )
    const repository = new GitHubRepository({
      storage: localStorage,
      key: 'github-test',
      fetcher,
    })
    await repository.signIn('valid-token')

    await expect(repository.save(emptySnapshot())).rejects.toThrow('403')
  })

  it('retries repeated cloud file conflicts before succeeding', async () => {
    let putAttempts = 0
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/user')) return jsonResponse({ login: 'owner' })
        if (!url.includes('/contents/workspace.json')) {
          return jsonResponse({
            private: true,
            permissions: { push: true },
          })
        }
        if (init?.method !== 'PUT') return jsonResponse({ sha: 'sha-0' })
        putAttempts += 1
        if (putAttempts < 3) {
          return jsonResponse({ message: 'sha does not match' }, 409)
        }
        return jsonResponse({ content: { sha: 'sha-3' } })
      },
    )
    const repository = new GitHubRepository({
      storage: localStorage,
      key: 'github-test',
      fetcher,
    })
    await repository.signIn('valid-token')

    await expect(repository.save(emptySnapshot())).resolves.toBeUndefined()
    expect(putAttempts).toBe(3)
  })

  it('treats matching cloud content as an already completed backup', async () => {
    const snapshot = emptySnapshot()
    const content = encodeBase64(JSON.stringify(snapshot))
    let putAttempts = 0
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/user')) return jsonResponse({ login: 'owner' })
        if (!url.includes('/contents/workspace.json')) {
          return jsonResponse({
            private: true,
            permissions: { push: true },
          })
        }
        if (init?.method === 'PUT') {
          putAttempts += 1
          return jsonResponse({ message: 'tree is not modified' }, 422)
        }
        return jsonResponse({
          sha: 'sha-current',
          content,
          encoding: 'base64',
        })
      },
    )
    const repository = new GitHubRepository({
      storage: localStorage,
      key: 'github-test',
      fetcher,
    })
    await repository.signIn('valid-token')

    await expect(repository.save(snapshot)).resolves.toBeUndefined()
    expect(putAttempts).toBe(0)
  })

  it('serializes overlapping automatic and manual saves', async () => {
    const snapshots = [
      emptySnapshot(),
      {
        ...emptySnapshot(),
        goals: [
          {
            id: 'goal-1',
            personId: 'person-1',
            title: '自动保存',
            details: '',
            status: 'active' as const,
            targetDate: null,
            createdAt: '2026-10-21T00:00:00.000Z',
            updatedAt: '2026-10-21T00:00:00.000Z',
          },
        ],
      },
      {
        ...emptySnapshot(),
        goals: [
          {
            id: 'goal-2',
            personId: 'person-1',
            title: '手动备份',
            details: '',
            status: 'active' as const,
            targetDate: null,
            createdAt: '2026-10-21T00:01:00.000Z',
            updatedAt: '2026-10-21T00:01:00.000Z',
          },
        ],
      },
    ]
    let currentSha = 'sha-0'
    let committedContent = ''
    let writes = 0
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/user')) return jsonResponse({ login: 'owner' })
        if (!url.includes('/contents/workspace.json')) {
          return jsonResponse({ private: true, permissions: { push: true } })
        }
        if (init?.method !== 'PUT') return jsonResponse({ sha: currentSha })

        const body = JSON.parse(String(init.body)) as {
          content: string
          sha?: string
        }
        if (body.sha !== currentSha) {
          return jsonResponse({ message: 'sha does not match' }, 409)
        }
        currentSha = `sha-${++writes}`
        committedContent = body.content
        return jsonResponse({ content: { sha: currentSha } })
      },
    )
    const repository = new GitHubRepository({
      storage: localStorage,
      key: 'github-test',
      fetcher,
    })
    await repository.signIn('valid-token')

    await Promise.all(snapshots.map((snapshot) => repository.save(snapshot)))

    expect(writes).toBe(3)
    expect(committedContent).toBe(encodeBase64(JSON.stringify(snapshots[2])))
  })

  it('keeps a newer local edit pending while an older save completes', async () => {
    const older = emptySnapshot()
    const newer = {
      ...emptySnapshot(),
      goals: [
        {
          id: 'goal-newer',
          personId: 'person-1',
          title: '保存期间的新修改',
          status: 'active' as const,
          targetDate: null,
        },
      ],
    }
    let releaseWrite: (() => void) | undefined
    let markWriteStarted: (() => void) | undefined
    const writeStarted = new Promise<void>((resolve) => {
      markWriteStarted = resolve
    })
    const writeGate = new Promise<void>((resolve) => {
      releaseWrite = resolve
    })
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/user')) return jsonResponse({ login: 'owner' })
        if (!url.includes('/contents/workspace.json')) {
          return jsonResponse({ private: true, permissions: { push: true } })
        }
        if (init?.method !== 'PUT') return jsonResponse({ sha: 'sha-0' })
        markWriteStarted?.()
        await writeGate
        return jsonResponse({ content: { sha: 'sha-1' } })
      },
    )
    const repository = new GitHubRepository({
      storage: localStorage,
      key: 'github-test',
      fetcher,
    })
    await repository.signIn('valid-token')

    const saving = repository.save(older)
    await writeStarted
    repository.cache(newer)
    releaseWrite?.()
    await saving

    expect(repository.hasPendingCloud()).toBe(true)
    await expect(repository.load()).resolves.toEqual(newer)
  })

  it('can keep a verified token only for the current session', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/user')) return jsonResponse({ login: 'owner' })
      return jsonResponse({ private: true, permissions: { push: true } })
    })
    const repository = new GitHubRepository({
      storage: localStorage,
      key: 'github-test',
      fetcher: fetchMock,
    })

    await repository.signIn('temporary-token', '', false)

    await expect(repository.getSession()).resolves.toMatchObject({
      id: 'owner',
    })
    expect(localStorage.getItem('github-test-github-token')).toBeNull()
    expect(localStorage.getItem('github-test-session')).toBeNull()
  })

  it('stores new attachments as their own repository files', async () => {
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/user')) return jsonResponse({ login: 'owner' })
        if (url.includes('/contents/attachments/')) {
          if (init?.method === 'PUT') {
            return jsonResponse({ content: { sha: 'sha-attachment' } }, 201)
          }
          return jsonResponse({ message: 'Not Found' }, 404)
        }
        return jsonResponse({ private: true, permissions: { push: true } })
      },
    )
    const repository = new GitHubRepository({
      storage: localStorage,
      key: 'github-test',
      fetcher,
    })
    await repository.signIn('valid-token')

    const attachment = await repository.uploadAttachment(
      new File(['hello'], 'note.txt', { type: 'text/plain' }),
      'person-1',
    )

    expect(attachment.storagePath).toMatch(
      /^attachments\/attachment-[0-9a-f-]+\.txt$/,
    )
    expect(attachment.signedUrl).toBeUndefined()
    const putCall = fetcher.mock.calls.find(
      ([input, init]) =>
        String(input).includes('/contents/attachments/') &&
        init?.method === 'PUT',
    )
    const body = JSON.parse(String(putCall?.[1]?.body)) as {
      content: string
      message: string
    }
    expect(body.content).toBe(btoa('hello'))
    expect(body.message).toContain('添加附件')
  })

  it('reads private attachments through an authenticated raw request', async () => {
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, _init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/user')) return jsonResponse({ login: 'owner' })
        if (url.includes('/contents/attachments/')) {
          return new Response(new Blob(['image-bytes'], { type: 'image/png' }))
        }
        return jsonResponse({ private: true, permissions: { push: true } })
      },
    )
    const createObjectURL = vi.fn(() => 'blob:attachment-1')
    URL.createObjectURL = createObjectURL
    const repository = new GitHubRepository({
      storage: localStorage,
      key: 'github-test',
      fetcher,
    })
    await repository.signIn('valid-token')

    await expect(
      repository.getAttachmentUrl('attachments/photo.png'),
    ).resolves.toBe('blob:attachment-1')
    await repository.getAttachmentUrl('attachments/photo.png')

    const calls = fetcher.mock.calls.filter(([input]) =>
      String(input).includes('/contents/attachments/'),
    )
    expect(calls).toHaveLength(1)
    expect(calls[0][1]?.headers).toMatchObject({
      Accept: 'application/vnd.github.raw',
      Authorization: 'Bearer valid-token',
    })
  })

  it('migrates inline attachments out of the workspace snapshot', async () => {
    const dataUrl = `data:text/plain;base64,${btoa('hello')}`
    const cloud = {
      ...emptySnapshot(),
      attachments: [
        {
          id: 'attachment-legacy',
          personId: 'person-1',
          detailEntryId: null,
          fileName: 'note.txt',
          mimeType: 'text/plain',
          size: 5,
          storagePath: dataUrl,
          signedUrl: dataUrl,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    }
    const workspaceWrites: string[] = []
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/user')) return jsonResponse({ login: 'owner' })
        if (url.includes('/contents/attachments/')) {
          if (init?.method === 'PUT') {
            return jsonResponse({ content: { sha: 'sha-attachment' } }, 201)
          }
          return jsonResponse({ message: 'Not Found' }, 404)
        }
        if (url.includes('/contents/workspace.json')) {
          if (init?.method === 'PUT') {
            const body = JSON.parse(String(init.body)) as { content: string }
            workspaceWrites.push(body.content)
            return jsonResponse({ content: { sha: 'sha-workspace' } })
          }
          return jsonResponse({
            content: encodeBase64(JSON.stringify(cloud)),
          })
        }
        return jsonResponse({ private: true, permissions: { push: true } })
      },
    )
    const repository = new GitHubRepository({
      storage: localStorage,
      key: 'github-test',
      fetcher,
    })
    await repository.signIn('valid-token')

    const loaded = await repository.load()

    expect(loaded.attachments[0].storagePath).toBe(
      'attachments/attachment-legacy.txt',
    )
    expect(loaded.attachments[0].signedUrl).toBeUndefined()
    expect(localStorage.getItem('github-test')).not.toContain('data:text/plain')
    await vi.waitFor(() => expect(workspaceWrites).toHaveLength(1))
    const saved = JSON.parse(
      atob(workspaceWrites[0]),
    ) as typeof cloud
    expect(saved.attachments[0].storagePath).toBe(
      'attachments/attachment-legacy.txt',
    )
  })
})
