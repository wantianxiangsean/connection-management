import type { DatabaseSnapshot, Attachment } from '../domain/types'

export type RepositoryMode = 'local' | 'github' | 'supabase'

export interface SessionUser {
  id: string
  phone: string
}

export interface WorkspaceRepository {
  mode: RepositoryMode
  load(): Promise<DatabaseSnapshot>
  save(snapshot: DatabaseSnapshot): Promise<void>
  signIn(phone: string, password: string): Promise<SessionUser>
  signOut(): Promise<void>
  getSession(): Promise<SessionUser | null>
  onAuthStateChange(callback: (user: SessionUser | null) => void): () => void
  uploadAttachment(
    file: File,
    personId: string,
    detailEntryId?: string | null,
    interactionId?: string | null,
  ): Promise<Attachment>
  getAttachmentUrl(path: string): Promise<string>
}
