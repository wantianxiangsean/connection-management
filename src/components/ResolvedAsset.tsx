import { Paperclip } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Attachment } from '../domain/types'
import { resolveAssetUrl } from '../data/asset-url'
import type { WorkspaceRepository } from '../data/repository'

function useResolvedAsset(path: string, repository: WorkspaceRepository) {
  const [resolved, setResolved] = useState(path)

  useEffect(() => {
    let active = true
    void resolveAssetUrl(path, repository)
      .then((url) => {
        if (active) setResolved(url)
      })
      .catch(() => {
        if (active) setResolved('')
      })
    return () => {
      active = false
    }
  }, [path, repository])

  return resolved
}

export function ResolvedImage({
  path,
  alt,
  repository,
}: {
  path: string
  alt: string
  repository: WorkspaceRepository
}) {
  const src = useResolvedAsset(path, repository)
  if (!src) return null
  return <img src={src} alt={alt} />
}

export function ResolvedAttachmentLink({
  attachment,
  repository,
}: {
  attachment: Attachment
  repository: WorkspaceRepository
}) {
  const href = useResolvedAsset(attachment.storagePath, repository)
  if (!href) {
    return (
      <span className="attachment-unavailable">
        <Paperclip size={16} />
        {attachment.fileName}
        <small>暂时无法读取</small>
      </span>
    )
  }
  return (
    <a href={href} target="_blank" rel="noreferrer">
      <Paperclip size={16} />
      {attachment.fileName}
    </a>
  )
}

