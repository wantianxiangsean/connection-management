import JSZip from 'jszip'
import Papa from 'papaparse'
import type { DatabaseSnapshot } from '../../domain/types'
import { influenceLabels, intimacyLabels, tierLabels } from '../../domain/types'
import type { WorkspaceRepository } from '../../data/repository'

export function workspaceToCsv(snapshot: DatabaseSnapshot) {
  const fields = snapshot.customFields
    .filter((field) => field.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder)
  const rows = snapshot.people
    .filter((person) => person.kind === 'contact' && !person.deletedAt)
    .map((person) => {
      const row: Record<string, string> = {
        姓名: person.fullName,
        关系: person.tier ? tierLabels[person.tier] : '',
        角色: person.role,
        职务: person.occupation,
        公司: person.company ?? '',
        地区: person.region,
        行业: person.industry,
        毕业院校: person.school ?? '',
        专业: person.major ?? '',
        影响力: person.influence ? influenceLabels[person.influence] : '',
        亲密度: person.intimacy ? intimacyLabels[person.intimacy] : '',
        备注: person.notes,
        联系周期天数: person.cadenceDays ? String(person.cadenceDays) : '',
      }
      for (const field of fields) {
        const value = snapshot.customValues.find(
          (item) => item.personId === person.id && item.fieldId === field.id,
        )
        row[field.label] = Array.isArray(value?.value)
          ? value.value.join('、')
          : String(value?.value ?? '')
      }
      return row
    })
  return Papa.unparse(rows)
}

export function downloadBlob(content: BlobPart, fileName: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export async function createBackupArchive(
  snapshot: DatabaseSnapshot,
  repository: WorkspaceRepository,
) {
  const zip = new JSZip()
  zip.file('connection-workspace.json', JSON.stringify(snapshot, null, 2))

  for (const attachment of snapshot.attachments) {
    try {
      const url = await repository.getAttachmentUrl(attachment.storagePath)
      const response = await fetch(url)
      if (!response.ok) continue
      const data = await response.blob()
      zip.file(`attachments/${attachment.id}-${attachment.fileName}`, data)
    } catch {
      zip.file(
        `attachments/${attachment.id}-${attachment.fileName}.missing.txt`,
        `无法在导出时读取附件：${attachment.storagePath}`,
      )
    }
  }

  return zip.generateAsync({ type: 'blob' })
}
