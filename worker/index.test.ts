import { describe, expect, it } from 'vitest'
import worker from './index.js'

interface StoredValue {
  value: string | ArrayBuffer
  metadata: Record<string, unknown> | null
}

function createKv() {
  const store = new Map<string, StoredValue>()
  return {
    store,
    async getWithMetadata(
      key: string,
      type?: 'text' | 'arrayBuffer',
    ): Promise<{ value: string | ArrayBuffer | null; metadata: unknown }> {
      const item = store.get(key)
      if (!item) return { value: null, metadata: null }
      if (type === 'arrayBuffer') {
        return {
          value:
            typeof item.value === 'string'
              ? new TextEncoder().encode(item.value).buffer
              : item.value,
          metadata: item.metadata,
        }
      }
      return {
        value:
          typeof item.value === 'string'
            ? item.value
            : new TextDecoder().decode(item.value),
        metadata: item.metadata,
      }
    },
    async put(
      key: string,
      value: string | ArrayBuffer,
      options?: { metadata?: Record<string, unknown> },
    ) {
      store.set(key, { value, metadata: options?.metadata ?? null })
    },
  }
}

function createEnv() {
  return {
    WORKSPACE: createKv(),
    ASSETS: {
      fetch: async () =>
        new Response('<html>app</html>', {
          headers: { 'content-type': 'text/html;charset=utf-8' },
        }),
    },
    SITE_PASSWORD: 'secret-password',
    AUTH_SECRET: 'signing-secret',
  }
}

function request(path: string, init?: RequestInit) {
  return new Request(`https://crm.example.test${path}`, init)
}

async function signIn(env: ReturnType<typeof createEnv>) {
  const response = await worker.fetch(
    request('/login', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'password=secret-password',
      redirect: 'manual',
    }),
    env,
  )
  const cookie = (response.headers.get('set-cookie') || '').split(';')[0]
  return { response, cookie }
}

describe('cloudflare worker', () => {
  it('redirects pages and rejects API calls without a session', async () => {
    const env = createEnv()

    const page = await worker.fetch(request('/'), env)
    expect(page.status).toBe(302)
    expect(page.headers.get('location')).toBe(
      'https://crm.example.test/login?next=%2F',
    )

    const api = await worker.fetch(request('/api/workspace'), env)
    expect(api.status).toBe(401)
    await expect(api.json()).resolves.toEqual({ error: 'unauthorized' })
  })

  it('rejects a wrong password and sets a session for the right one', async () => {
    const env = createEnv()
    const wrong = await worker.fetch(
      request('/login', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'password=nope',
        redirect: 'manual',
      }),
      env,
    )
    expect(wrong.status).toBe(401)

    const { response, cookie } = await signIn(env)
    expect(response.status).toBe(303)
    expect(cookie.startsWith('crm_s=')).toBe(true)

    const health = await worker.fetch(
      request('/api/health', { headers: { Cookie: cookie } }),
      env,
    )
    expect(health.status).toBe(200)
    await expect(health.json()).resolves.toEqual({ ok: true })
  })

  it('stores and returns the workspace snapshot', async () => {
    const env = createEnv()
    const { cookie } = await signIn(env)
    const headers = { Cookie: cookie }

    const missing = await worker.fetch(request('/api/workspace', { headers }), env)
    expect(missing.status).toBe(404)

    const snapshot = JSON.stringify({ clients: [{ id: 'client-1' }] })
    const saved = await worker.fetch(
      request('/api/workspace', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: snapshot,
      }),
      env,
    )
    expect(saved.status).toBe(200)

    const loaded = await worker.fetch(
      request('/api/workspace', { headers }),
      env,
    )
    expect(loaded.status).toBe(200)
    await expect(loaded.text()).resolves.toBe(snapshot)
    expect(loaded.headers.get('x-robots-tag')).toContain('noindex')
  })

  it('stores attachments and serves them back with their type', async () => {
    const env = createEnv()
    const { cookie } = await signIn(env)
    const headers = { Cookie: cookie }

    const saved = await worker.fetch(
      request('/api/attachments/attachment-1.png', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'image/png' },
        body: new Uint8Array([1, 2, 3, 4]),
      }),
      env,
    )
    expect(saved.status).toBe(200)
    await expect(saved.json()).resolves.toEqual({
      ok: true,
      path: 'attachments/attachment-1.png',
    })

    const loaded = await worker.fetch(
      request('/api/attachments/attachment-1.png', { headers }),
      env,
    )
    expect(loaded.status).toBe(200)
    expect(loaded.headers.get('content-type')).toBe('image/png')
    const bytes = new Uint8Array(await loaded.arrayBuffer())
    expect(Array.from(bytes)).toEqual([1, 2, 3, 4])

    const anonymous = await worker.fetch(
      request('/api/attachments/attachment-1.png'),
      env,
    )
    expect(anonymous.status).toBe(401)
  })

  it('serves the app shell to signed-in visitors', async () => {
    const env = createEnv()
    const { cookie } = await signIn(env)

    const response = await worker.fetch(
      request('/', { headers: { Cookie: cookie } }),
      env,
    )
    expect(response.status).toBe(200)
    await expect(response.text()).resolves.toContain('<html>app</html>')
    expect(response.headers.get('cache-control')).toBe('no-cache')
  })
})
