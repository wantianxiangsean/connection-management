export function splitIndustries(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split('、')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  )
}
