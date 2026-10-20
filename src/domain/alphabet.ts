import { pinyin } from 'pinyin-pro'

function normalizedName(fullName: string) {
  return fullName
    .normalize('NFKC')
    .replace(/^[\s"'“”‘’·._-]+/, '')
    .trim()
}

function surnameSortKey(fullName: string) {
  return pinyin(normalizedName(fullName), {
    toneType: 'none',
    type: 'array',
    nonZh: 'consecutive',
  })
    .join('')
    .toLocaleLowerCase('en')
}

export function getSurnameInitial(fullName: string) {
  const name = normalizedName(fullName)
  const first = name.slice(0, 1)
  if (!first) return '#'

  const latin = first.toLocaleUpperCase('en')
  if (/^[A-Z]$/.test(latin)) return latin

  const pinyinInitial = pinyin(first, {
    toneType: 'none',
    pattern: 'first',
  })
    .slice(0, 1)
    .toLocaleUpperCase('en')

  return /^[A-Z]$/.test(pinyinInitial) ? pinyinInitial : '#'
}

export function sortBySurname<T extends { fullName: string }>(people: T[]) {
  return [...people].sort((a, b) => {
    const initialOrder = getSurnameInitial(a.fullName).localeCompare(
      getSurnameInitial(b.fullName),
    )
    if (initialOrder !== 0) return initialOrder

    const pinyinOrder = surnameSortKey(a.fullName).localeCompare(
      surnameSortKey(b.fullName),
      'en',
    )
    return pinyinOrder || a.fullName.localeCompare(b.fullName, 'zh-CN')
  })
}
