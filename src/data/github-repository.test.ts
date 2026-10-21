import { afterEach, describe, expect, it, vi } from 'vitest'
import { emptySnapshot } from '../domain/workspace'
import { GitHubRepository } from './github-repository'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
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
      return jsonResponse({ private: true })
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
        return jsonResponse({ private: true })
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
})
