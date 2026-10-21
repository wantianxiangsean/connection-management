const regionSeparator = /[、,，;；/\\|]+/

export function splitRegionValues(value: string) {
  return value
    .split(regionSeparator)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function listRegionValues(values: string[]) {
  return [
    ...new Set(
      values.flatMap((value) => splitRegionValues(value)),
    ),
  ]
}

export function matchesRegion(value: string, selected: string) {
  return !selected || splitRegionValues(value).includes(selected)
}
