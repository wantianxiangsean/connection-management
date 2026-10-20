import { describe, expect, it, vi } from 'vitest'
import { resolveAssetUrl } from './asset-url'
import type { WorkspaceRepository } from './repository'

describe('storage asset URLs', () => {
  it('turns a private storage path into a signed URL', async () => {
    const repository = {
      getAttachmentUrl: vi.fn().mockResolvedValue('https://signed.example/file'),
    } as unknown as WorkspaceRepository

    await expect(
      resolveAssetUrl('owner/person/photo.jpg', repository),
    ).resolves.toBe('https://signed.example/file')
    expect(repository.getAttachmentUrl).toHaveBeenCalledWith(
      'owner/person/photo.jpg',
    )
  })

  it('leaves local data URLs untouched', async () => {
    const repository = {
      getAttachmentUrl: vi.fn(),
    } as unknown as WorkspaceRepository

    await expect(
      resolveAssetUrl('data:image/png;base64,abc', repository),
    ).resolves.toBe('data:image/png;base64,abc')
    expect(repository.getAttachmentUrl).not.toHaveBeenCalled()
  })
})

