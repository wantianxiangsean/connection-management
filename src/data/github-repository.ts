import type { Attachment, DatabaseSnapshot } from '../domain/types'
import type {
  SessionUser,
  WorkspaceRepository,
} from './repository'

interface GitHubRepositoryOptions {
  storage?: Storage
  key?: string
  repository?: string
  path?: string
  branch?: string
  fetcher?: typeof fetch
}

export class GitHubRepository implements WorkspaceRepository {
  mode = 'github' as const
  private storage: Storage
  private key: string
  private repository: string
  private path: string
  private branch: string
  private fetcher: typeof fetch
  private listeners = new Set<(user: SessionUser | null) => void>()

  constructor(options: GitHubRepositoryOptions = {}) {
    this.storage = options.storage ?? window.localStorage
    this.key = options.key ?? 'connection-management-workspace-v1'
    this.repository =
      options.repository ?? 'wantianxiangsean/connection-management-data'
    this.path = options.path ?? 'workspace.json'
    this.branch = options.branch ?? 'main'
    this.fetcher = options.fetcher ?? window.fetch.bind(window)
  }

  async load(): Promise<DatabaseSnapshot> {
    const cached = this.storage.getItem(this.key)
    const token = this.storage.getItem(`${this.key}-github-token`)
    if (!token) {
      if (cached) return JSON.parse(cached) as DatabaseSnapshot
      throw new Error('请先使用 GitHub Token 验证身份')
    }

    try {
      const response = await this.api(
        `/repos/${this.repository}/contents/${encodeURIComponent(this.path)}?ref=${this.branch}`,
        token,
      )
      if (response.status === 404 && cached) {
        return JSON.parse(cached) as DatabaseSnapshot
      }
      if (!response.ok) throw new Error('云端档案读取失败')
      const data = (await response.json()) as { content?: string }
      if (!data.content) throw new Error('云端档案格式无效')
      const snapshot = JSON.parse(decodeBase64(data.content)) as DatabaseSnapshot
      this.storage.setItem(this.key, JSON.stringify(snapshot))
      return snapshot
    } catch (cause) {
      if (cached) return JSON.parse(cached) as DatabaseSnapshot
      throw cause
    }
  }

  async save(snapshot: DatabaseSnapshot) {
    const serialized = JSON.stringify(snapshot)
    this.storage.setItem(this.key, serialized)
    const token = this.storage.getItem(`${this.key}-github-token`)
    if (!token) return

    const content = encodeBase64(serialized)
    let response = await this.putContents(token, content)
    if (response.status === 409) {
      response = await this.putContents(token, content, true)
    }
    if (!response.ok) {
      throw new Error('云端备份失败，请检查 GitHub Token 权限')
    }
  }

  async signIn(tokenInput: string): Promise<SessionUser> {
    const token = tokenInput.trim()
    if (!token) throw new Error('请输入 GitHub Token')

    const repositoryResponse = await this.api(
      `/repos/${this.repository}`,
      token,
    )
    if (!repositoryResponse.ok) {
      throw new Error('Token 无效或无权访问私有数据仓库')
    }
    const cloudRepository = (await repositoryResponse.json()) as {
      private?: boolean
    }
    if (!cloudRepository.private) {
      throw new Error('数据仓库必须是私有仓库')
    }

    const userResponse = await this.api('/user', token)
    if (!userResponse.ok) {
      throw new Error('GitHub Token 无效')
    }
    const githubUser = (await userResponse.json()) as { login: string }
    const user = { id: githubUser.login, phone: githubUser.login }
    this.storage.setItem(`${this.key}-github-token`, token)
    this.storage.setItem(`${this.key}-session`, JSON.stringify(user))
    this.listeners.forEach((listener) => listener(user))
    return user
  }

  async signOut() {
    this.storage.removeItem(`${this.key}-session`)
    this.storage.removeItem(`${this.key}-github-token`)
    this.listeners.forEach((listener) => listener(null))
  }

  async getSession() {
    const token = this.storage.getItem(`${this.key}-github-token`)
    const value = this.storage.getItem(`${this.key}-session`)
    if (!token || !value) return null
    return JSON.parse(value) as SessionUser
  }

  onAuthStateChange(callback: (user: SessionUser | null) => void) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  async uploadAttachment(
    file: File,
    personId: string,
    detailEntryId?: string | null,
    interactionId?: string | null,
  ): Promise<Attachment> {
    const dataUrl = await fileToDataUrl(file)
    return {
      id: `attachment-${crypto.randomUUID()}`,
      personId,
      detailEntryId: detailEntryId ?? null,
      interactionId: interactionId ?? null,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      storagePath: dataUrl,
      signedUrl: dataUrl,
      createdAt: new Date().toISOString(),
    }
  }

  async getAttachmentUrl(path: string) {
    return path
  }

  private api(path: string, token: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers)
    headers.set('Authorization', `Bearer ${token}`)
    headers.set('Accept', 'application/vnd.github+json')
    headers.set('X-GitHub-Api-Version', '2022-11-28')
    return this.fetcher(`https://api.github.com${path}`, {
      ...init,
      headers,
    })
  }

  private async putContents(
    token: string,
    content: string,
    refreshSha = false,
  ) {
    let sha: string | undefined
    const current = await this.api(
      `/repos/${this.repository}/contents/${encodeURIComponent(this.path)}?ref=${this.branch}`,
      token,
    )
    if (current.ok) {
      sha = ((await current.json()) as { sha?: string }).sha
    } else if (current.status !== 404 && !refreshSha) {
      return current
    }
    return this.api(
      `/repos/${this.repository}/contents/${encodeURIComponent(this.path)}`,
      token,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '同步见微人脉档案',
          content,
          branch: this.branch,
          ...(sha ? { sha } : {}),
        }),
      },
    )
  }
}

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function decodeBase64(value: string) {
  const binary = atob(value.replace(/\s/g, ''))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
