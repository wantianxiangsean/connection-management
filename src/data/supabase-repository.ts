import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { DatabaseSnapshot, Attachment } from '../domain/types'
import type {
  SessionUser,
  WorkspaceRepository,
} from './repository'

const BUCKET = 'connection-attachments'

export function isSupabaseConfigured() {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
      import.meta.env.VITE_SUPABASE_ANON_KEY &&
      !import.meta.env.VITE_SUPABASE_URL.includes('your-project'),
  )
}

export class SupabaseRepository implements WorkspaceRepository {
  mode = 'supabase' as const
  private client: SupabaseClient

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey)
  }

  async load(_forceRemote = false): Promise<DatabaseSnapshot> {
    const { data, error } = await this.client.rpc('load_connection_workspace')
    if (error) throw error
    return (data ?? emptyWorkspace()) as DatabaseSnapshot
  }

  async save(snapshot: DatabaseSnapshot) {
    const { error } = await this.client.rpc('save_connection_workspace', {
      workspace: snapshot,
    })
    if (error) throw error
  }

  async signIn(phone: string, password: string) {
    const normalized = phone.trim().startsWith('+')
      ? phone.trim()
      : `+86${phone.trim()}`
    const { data, error } = await this.client.auth.signInWithPassword({
      phone: normalized,
      password,
    })
    if (error) throw error
    return mapUser(data.user.phone ?? normalized, data.user.id)
  }

  async signOut() {
    const { error } = await this.client.auth.signOut()
    if (error) throw error
  }

  async getSession() {
    const { data } = await this.client.auth.getSession()
    if (!data.session?.user) return null
    return mapUser(
      data.session.user.phone ?? '',
      data.session.user.id,
    )
  }

  onAuthStateChange(callback: (user: SessionUser | null) => void) {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      callback(
        session?.user
          ? mapUser(session.user.phone ?? '', session.user.id)
          : null,
      )
    })
    return () => data.subscription.unsubscribe()
  }

  async uploadAttachment(
    file: File,
    personId: string,
    detailEntryId?: string | null,
    interactionId?: string | null,
  ): Promise<Attachment> {
    const { data: userData, error: userError } = await this.client.auth.getUser()
    if (userError || !userData.user) throw userError ?? new Error('登录已失效')
    const extension = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
    const path = `${userData.user.id}/${personId}/${crypto.randomUUID()}.${extension}`
    const { error } = await this.client.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })
    if (error) throw error
    const signedUrl = await this.getAttachmentUrl(path)
    return {
      id: `attachment-${crypto.randomUUID()}`,
      personId,
      detailEntryId: detailEntryId ?? null,
      interactionId: interactionId ?? null,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      storagePath: path,
      signedUrl,
      createdAt: new Date().toISOString(),
    }
  }

  async getAttachmentUrl(path: string) {
    const { data, error } = await this.client.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600)
    if (error) throw error
    return data.signedUrl
  }
}

function mapUser(phone: string, id: string): SessionUser {
  return { id, phone }
}

function emptyWorkspace(): DatabaseSnapshot {
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
