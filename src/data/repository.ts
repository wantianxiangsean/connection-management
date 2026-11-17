import type { DatabaseSnapshot, Attachment } from '../domain/types'

export type RepositoryMode = 'local' | 'cloudflare'

export interface SessionUser {
  id: string
}

export interface WorkspaceRepository {
  mode: RepositoryMode
  load(forceRemote?: boolean): Promise<DatabaseSnapshot>
  save(snapshot: DatabaseSnapshot): Promise<void>
  cache(snapshot: DatabaseSnapshot): void
  hasPendingCloud(): boolean
  uploadAttachment(
    file: File,
    personId: string,
    detailEntryId?: string | null,
    interactionId?: string | null,
  ): Promise<Attachment>
  getAttachmentUrl(path: string): Promise<string>
}
