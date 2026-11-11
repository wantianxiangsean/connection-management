import type { Attachment, DatabaseSnapshot } from '../domain/types'
import { emptySnapshot } from '../domain/workspace'
import type { SessionUser, WorkspaceRepository } from './repository'

interface CloudflareRepositoryOptions {
  storage?: Storage
  key?: string
  fetcher?: typeof fetch
}

const OWNER: SessionUser = { id: 'private-owner', phone: '' }

export class CloudflareRepository implements WorkspaceRepository {
  mode = 'cloudflare' as const
  private storage: Storage
  private key: string
  private fetcher: typeof fetch
  private attachmentUrls = new Map<string, string>()

  constructor(options: CloudflareRepositoryOptions = {}) {
    this.storage = options.storage ?? window.localStorage
    this.key = options.key ?? 'connection-management-workspace-v1'
    this.fetcher = options.fetcher ?? window.fetch.bind(window)
  }

  async load(forceRemote = false): Promise<DatabaseSnapshot> {
    const cached = this.storage.getItem(this.key)
    if (cached && this.hasPendingCloud() && !forceRemote) {
      return JSON.parse(cached) as DatabaseSnapshot
    }

    try {
      const response = await this.fetcher('/api/workspace', {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })
      if (response.status === 404) {
        const empty = emptySnapshot()
        this.storage.setItem(this.key, JSON.stringify(empty))
        this.storage.removeItem(`${this.key}-pending-cloud`)
        return empty
      }
      if (response.status === 401) {
        throw new Error('登录状态已失效，请刷新页面重新登录')
      }
      if (!response.ok) {
        throw new Error(`云端档案读取失败（${response.status}）`)
      }
      const snapshot = (await response.json()) as DatabaseSnapshot
      this.storage.setItem(this.key, JSON.stringify(snapshot))
      this.storage.removeItem(`${this.key}-pending-cloud`)
      return snapshot
    } catch (cause) {
      if (cached && !forceRemote) {
        return JSON.parse(cached) as DatabaseSnapshot
      }
      throw cause
    }
  }

  async save(snapshot: DatabaseSnapshot) {
    const serialized = JSON.stringify(snapshot)
    this.cache(snapshot)
    const response = await this.fetcher('/api/workspace', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: serialized,
    })
    if (!response.ok) {
      throw new Error(await writeError(response))
    }
    if (this.storage.getItem(this.key) === serialized) {
      this.storage.removeItem(`${this.key}-pending-cloud`)
    }
  }

  cache(snapshot: DatabaseSnapshot) {
    this.storage.setItem(this.key, JSON.stringify(snapshot))
    this.storage.setItem(`${this.key}-pending-cloud`, '1')
  }

  hasPendingCloud() {
    return this.storage.getItem(`${this.key}-pending-cloud`) === '1'
  }

  async uploadAttachment(
    file: File,
    personId: string,
    detailEntryId?: string | null,
    interactionId?: string | null,
  ): Promise<Attachment> {
    const id = `attachment-${crypto.randomUUID()}`
    const name = `${id}.${extensionForFile(file)}`
    const response = await this.fetcher(
      `/api/attachments/${encodeURIComponent(name)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      },
    )
    if (!response.ok) {
      throw new Error(await writeError(response))
    }
    return {
      id,
      personId,
      detailEntryId: detailEntryId ?? null,
      interactionId: interactionId ?? null,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      storagePath: `attachments/${name}`,
      createdAt: new Date().toISOString(),
    }
  }

  async getAttachmentUrl(path: string) {
    if (/^(https?:|data:|blob:)/i.test(path)) return path
    const cached = this.attachmentUrls.get(path)
    if (cached) return cached
    const match = /^attachments\/([^/]+)$/.exec(path)
    const url = match
      ? `/api/attachments/${encodeURIComponent(match[1])}`
      : path
    this.attachmentUrls.set(path, url)
    return url
  }

  async signIn(): Promise<SessionUser> {
    throw new Error('请通过登录页输入密码进入')
  }

  async signOut() {
    // The password gate lives in the Worker; /logout clears the session cookie.
  }

  async getSession() {
    return OWNER
  }

  onAuthStateChange() {
    return () => {}
  }
}

function extensionForFile(file: File) {
  const fromName = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (/^[a-z0-9]{1,8}$/.test(fromName)) return fromName
  const type = file.type.toLowerCase()
  if (type === 'image/png') return 'png'
  if (type === 'image/jpeg') return 'jpg'
  if (type === 'image/gif') return 'gif'
  if (type === 'image/webp') return 'webp'
  if (type === 'application/pdf') return 'pdf'
  return 'bin'
}

async function writeError(response: Response) {
  if (response.status === 401) {
    return '登录状态已失效，请刷新页面重新登录'
  }
  let detail = ''
  try {
    const body = (await response.clone().json()) as { error?: string }
    detail = body.error?.trim() ?? ''
  } catch {
    detail = ''
  }
  const reason =
    response.status === 413
      ? '文件或档案超过大小限制。'
      : response.status === 429
        ? '请求过于频繁，请稍后重试。'
        : response.status >= 500
          ? '云端服务暂时不可用，请稍后重试。'
          : `云端保存失败（${response.status}）。`
  return detail ? `${reason} ${detail}` : reason
}
