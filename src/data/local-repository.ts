import type { Attachment, DatabaseSnapshot } from '../domain/types'
import { createSampleSnapshot } from './sample-data'
import type {
  SessionUser,
  WorkspaceRepository,
} from './repository'

interface LocalRepositoryOptions {
  storage?: Storage
  key?: string
  seed?: boolean
}

export class LocalRepository implements WorkspaceRepository {
  mode = 'local' as const
  private storage: Storage
  private key: string
  private seed: boolean
  private listeners = new Set<(user: SessionUser | null) => void>()

  constructor(options: LocalRepositoryOptions = {}) {
    this.storage = options.storage ?? window.localStorage
    this.key = options.key ?? 'connection-management-workspace-v1'
    this.seed = options.seed ?? true
  }

  async load(_forceRemote = false): Promise<DatabaseSnapshot> {
    const saved = this.storage.getItem(this.key)
    if (saved) return JSON.parse(saved) as DatabaseSnapshot
    const initial = this.seed ? createSampleSnapshot() : createEmptyLocalSnapshot()
    await this.save(initial)
    return initial
  }

  async save(snapshot: DatabaseSnapshot) {
    this.storage.setItem(this.key, JSON.stringify(snapshot))
  }

  cache(snapshot: DatabaseSnapshot) {
    this.storage.setItem(this.key, JSON.stringify(snapshot))
  }

  async signIn(phone: string, password: string): Promise<SessionUser> {
    if (!phone.trim() || !password.trim()) {
      throw new Error('请输入账号和密码')
    }
    const user = { id: 'local-owner', phone }
    this.storage.setItem(`${this.key}-session`, JSON.stringify(user))
    this.listeners.forEach((listener) => listener(user))
    return user
  }

  async signOut() {
    this.storage.removeItem(`${this.key}-session`)
    this.listeners.forEach((listener) => listener(null))
  }

  async getSession() {
    const value = this.storage.getItem(`${this.key}-session`)
    return value ? (JSON.parse(value) as SessionUser) : null
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
}

function createEmptyLocalSnapshot(): DatabaseSnapshot {
  return {
    people: [],
    connections: [],
    interactions: [],
    familyMembers: [],
    careerEntries: [],
    goals: [],
    importantDates: [],
    detailEntries: [],
    attachments: [],
    clients: [],
    clientContacts: [],
    clientArtifacts: [],
    clientSolutionProducts: [],
    clientInteractions: [],
    clientTodos: [],
    customFields: [],
    customValues: [],
  }
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
