import type { Attachment, DatabaseSnapshot } from '../domain/types'
import { emptySnapshot } from '../domain/workspace'
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
  private transientToken: string | null = null
  private transientUser: SessionUser | null = null
  private saveTail: Promise<void> = Promise.resolve()
  private listeners = new Set<(user: SessionUser | null) => void>()
  private attachmentUrls = new Map<string, string>()

  constructor(options: GitHubRepositoryOptions = {}) {
    this.storage = options.storage ?? window.localStorage
    this.key = options.key ?? 'connection-management-workspace-v1'
    this.repository =
      options.repository ?? 'wantianxiangsean/connection-management-data'
    this.path = options.path ?? 'workspace.json'
    this.branch = options.branch ?? 'main'
    this.fetcher = options.fetcher ?? window.fetch.bind(window)
  }

  async load(forceRemote = false): Promise<DatabaseSnapshot> {
    const cached = this.storage.getItem(this.key)
    const token = this.getToken()
    if (!token) return emptySnapshot()
    if (cached && this.hasPendingCloud() && !forceRemote) {
      return JSON.parse(cached) as DatabaseSnapshot
    }

    try {
      const response = await this.api(
        `/repos/${this.repository}/contents/${encodeURIComponent(this.path)}?ref=${this.branch}`,
        token,
      )
      if (response.status === 404 && cached && !forceRemote) {
        return JSON.parse(cached) as DatabaseSnapshot
      }
      if (!response.ok) throw new Error('云端档案读取失败')
      const data = (await response.json()) as { content?: string }
      if (!data.content) throw new Error('云端档案格式无效')
      const snapshot = JSON.parse(decodeBase64(data.content)) as DatabaseSnapshot
      const migrated = await this.externalizeInlineAttachments(snapshot)
      this.storage.setItem(this.key, JSON.stringify(snapshot))
      this.storage.removeItem(`${this.key}-pending-cloud`)
      if (migrated) void this.save(snapshot).catch(() => undefined)
      return snapshot
    } catch (cause) {
      if (cached && !forceRemote) {
        return JSON.parse(cached) as DatabaseSnapshot
      }
      throw cause
    }
  }

  save(snapshot: DatabaseSnapshot) {
    const operation = this.saveTail.then(() => this.saveSnapshot(snapshot))
    this.saveTail = operation.then(
      () => undefined,
      () => undefined,
    )
    return operation
  }

  cache(snapshot: DatabaseSnapshot) {
    this.storage.setItem(this.key, JSON.stringify(snapshot))
    this.storage.setItem(`${this.key}-pending-cloud`, '1')
  }

  hasPendingCloud() {
    return this.storage.getItem(`${this.key}-pending-cloud`) === '1'
  }

  private async saveSnapshot(snapshot: DatabaseSnapshot) {
    await this.externalizeInlineAttachments(snapshot)
    const serialized = JSON.stringify(snapshot)
    this.cache(snapshot)
    const token = this.getToken()
    if (!token) return

    const content = encodeBase64(serialized)
    let response = await this.putContents(token, content)
    for (
      let retry = 1;
      retry <= 5 && response.status === 409;
      retry += 1
    ) {
      await delay(300 * 2 ** (retry - 1) + Math.floor(Math.random() * 150))
      response = await this.putContents(token, content)
    }
    if (!response.ok) {
      throw await createGitHubWriteError(response)
    }
    if (this.storage.getItem(this.key) === serialized) {
      this.storage.removeItem(`${this.key}-pending-cloud`)
    }
  }

  async signIn(
    tokenInput: string,
    _password = '',
    remember = true,
  ): Promise<SessionUser> {
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
      permissions?: { push?: boolean }
    }
    if (!cloudRepository.private) {
      throw new Error('数据仓库必须是私有仓库')
    }
    if (cloudRepository.permissions?.push !== true) {
      throw new Error(
        'GitHub Token 缺少数据仓库写入权限，请使用 Contents: Read and write 权限。',
      )
    }

    const userResponse = await this.api('/user', token)
    if (!userResponse.ok) {
      throw new Error('GitHub Token 无效')
    }
    const githubUser = (await userResponse.json()) as { login: string }
    const user = { id: githubUser.login, phone: githubUser.login }
    if (remember) {
      this.storage.setItem(`${this.key}-github-token`, token)
      this.storage.setItem(`${this.key}-session`, JSON.stringify(user))
      this.transientToken = null
      this.transientUser = null
    } else {
      this.storage.removeItem(`${this.key}-github-token`)
      this.storage.removeItem(`${this.key}-session`)
      this.transientToken = token
      this.transientUser = user
    }
    this.listeners.forEach((listener) => listener(user))
    return user
  }

  async signOut() {
    this.transientToken = null
    this.transientUser = null
    this.storage.removeItem(`${this.key}-session`)
    this.storage.removeItem(`${this.key}-github-token`)
    this.listeners.forEach((listener) => listener(null))
  }

  async getSession() {
    if (this.transientToken && this.transientUser) return this.transientUser
    const token = this.getToken()
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
    const token = this.getToken()
    if (!token) throw new Error('请先连接私有云端再添加附件')
    const id = `attachment-${crypto.randomUUID()}`
    const path = attachmentPath(id, extensionForFile(file))
    const content = encodeBytesBase64(await readFileBytes(file))
    const response = await this.putFileContents(
      token,
      path,
      content,
      `添加附件：${file.name}`,
    )
    if (!response.ok) throw await createGitHubWriteError(response)
    return {
      id,
      personId,
      detailEntryId: detailEntryId ?? null,
      interactionId: interactionId ?? null,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      storagePath: path,
      createdAt: new Date().toISOString(),
    }
  }

  async getAttachmentUrl(path: string) {
    if (/^(https?:|data:|blob:)/i.test(path)) return path
    const cached = this.attachmentUrls.get(path)
    if (cached) return cached
    const token = this.getToken()
    if (!token) throw new Error('需要连接私有云端才能读取附件')
    const response = await this.fetcher(
      `https://api.github.com/repos/${this.repository}/contents/${contentPath(path)}?ref=${this.branch}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.raw',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    )
    if (!response.ok) throw new Error('附件读取失败')
    const blob = await response.blob()
    const typed = blob.type.startsWith('application/vnd.github.raw')
      ? new Blob([blob], { type: mimeForPath(path) })
      : blob
    const url = URL.createObjectURL(typed)
    this.attachmentUrls.set(path, url)
    return url
  }

  private async externalizeInlineAttachments(snapshot: DatabaseSnapshot) {
    const inline = snapshot.attachments.filter((attachment) =>
      attachment.storagePath.startsWith('data:'),
    )
    if (!inline.length) return false
    const token = this.getToken()
    if (!token) return false
    let changed = false
    for (const attachment of inline) {
      const decoded = decodeDataUrl(attachment.storagePath)
      if (!decoded) continue
      const path = attachmentPath(attachment.id, decoded.extension)
      try {
        const response = await this.putFileContents(
          token,
          path,
          decoded.base64,
          `迁移附件：${attachment.fileName}`,
        )
        if (!response.ok) continue
        attachment.storagePath = path
        delete attachment.signedUrl
        changed = true
      } catch {
        // Keep the inline copy when the upload fails so no attachment is lost.
      }
    }
    return changed
  }

  private getToken() {
    return (
      this.transientToken ??
      this.storage.getItem(`${this.key}-github-token`)
    )
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

  private putContents(token: string, content: string) {
    return this.putFileContents(
      token,
      this.path,
      content,
      '同步见微人脉档案',
    )
  }

  private async putFileContents(
    token: string,
    path: string,
    content: string,
    message: string,
  ) {
    let sha: string | undefined
    const current = await this.api(
      `/repos/${this.repository}/contents/${contentPath(path)}?ref=${this.branch}`,
      token,
    )
    if (current.ok) {
      const currentFile = (await current.json()) as {
        sha?: string
        content?: string
        encoding?: string
      }
      if (
        currentFile.encoding === 'base64' &&
        currentFile.content?.replace(/\s/g, '') === content
      ) {
        return new Response(null, { status: 200 })
      }
      sha = currentFile.sha
    } else if (current.status !== 404) {
      return current
    }
    return this.api(
      `/repos/${this.repository}/contents/${contentPath(path)}`,
      token,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          content,
          branch: this.branch,
          ...(sha ? { sha } : {}),
        }),
      },
    )
  }
}

function encodeBase64(value: string) {
  return encodeBytesBase64(new TextEncoder().encode(value))
}

function encodeBytesBase64(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function decodeBase64(value: string) {
  const binary = atob(value.replace(/\s/g, ''))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function readFileBytes(file: File): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer().then((buffer) => new Uint8Array(buffer))
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

function contentPath(path: string) {
  return path.split('/').map(encodeURIComponent).join('/')
}

function attachmentPath(id: string, extension: string) {
  const name = id.replace(/[^A-Za-z0-9_-]/g, '') || crypto.randomUUID()
  return `attachments/${name}.${extension}`
}

function extensionForFile(file: File) {
  const fromName = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (/^[a-z0-9]{1,8}$/.test(fromName)) return fromName
  return extensionForMime(file.type)
}

function extensionForMime(mimeType: string) {
  const mime = mimeType.toLowerCase()
  if (mime === 'image/png') return 'png'
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/gif') return 'gif'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/svg+xml') return 'svg'
  if (mime === 'application/pdf') return 'pdf'
  if (mime === 'text/plain') return 'txt'
  return 'bin'
}

function mimeForPath(path: string) {
  const extension = path.split('.').pop()?.toLowerCase() ?? ''
  const types: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    txt: 'text/plain',
  }
  return types[extension] ?? 'application/octet-stream'
}

function decodeDataUrl(value: string) {
  const match = /^data:([^;,]+)?;base64,(.*)$/s.exec(value)
  if (!match) return null
  return {
    base64: match[2],
    extension: extensionForMime(match[1] ?? ''),
  }
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds)
  })
}

async function createGitHubWriteError(response: Response) {
  let detail = ''
  try {
    const body = (await response.clone().json()) as { message?: string }
    detail = body.message?.trim() ?? ''
  } catch {
    detail = ''
  }

  const reason =
    response.status === 401
      ? 'GitHub Token 已失效，请重新验证。'
      : response.status === 403
        ? 'GitHub 拒绝写入（403），请确认 Token 具有 Contents: Read and write 权限。'
        : response.status === 404
          ? '未找到云端数据文件（404），请确认数据仓库和 main 分支存在。'
          : response.status === 409
            ? '云端文件版本冲突（409）：可能另一台设备刚保存过。已自动重试多次仍未成功，请稍后再点一次“手动备份”；本机修改会保留。'
            : response.status === 422
              ? 'GitHub 无法接受这次写入（422）。'
              : response.status === 429
                ? 'GitHub API 请求过于频繁（429），请稍后重试。'
                : response.status >= 500
                  ? `GitHub 服务暂时不可用（${response.status}），请稍后重试。`
                  : `GitHub 写入失败（${response.status}）。`
  const requestId = response.headers.get('x-github-request-id')
  return new Error(
    [reason, detail && `GitHub：${detail}`, requestId && `请求 ID：${requestId}`]
      .filter(Boolean)
      .join(' '),
  )
}
