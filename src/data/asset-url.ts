import type { WorkspaceRepository } from './repository'

export async function resolveAssetUrl(
  path: string,
  repository: WorkspaceRepository,
) {
  if (/^(https?:|data:|blob:)/i.test(path)) return path
  return repository.getAttachmentUrl(path)
}
