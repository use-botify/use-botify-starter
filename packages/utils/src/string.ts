function splitWords(value: string): string[] {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[^a-zA-Z0-9]+/)
    .filter((word) => word.length > 0)
}

export function toKebabCase(value: string): string {
  return splitWords(value)
    .map((word) => word.toLowerCase())
    .join("-")
}

export function toPascalCase(value: string): string {
  return splitWords(value)
    .map((word) => {
      const first = word.charAt(0).toUpperCase()
      return `${first}${word.slice(1).toLowerCase()}`
    })
    .join("")
}

export function toCamelCase(value: string): string {
  const words = splitWords(value)

  return words
    .map((word, index) => {
      const lower = word.toLowerCase()
      if (index === 0) {
        return lower
      }
      return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`
    })
    .join("")
}

export function truncate(
  value: string,
  maxLength: number,
  suffix = "..."
): string {
  if (maxLength <= 0) {
    return ""
  }

  if (value.length <= maxLength) {
    return value
  }

  if (suffix.length >= maxLength) {
    return suffix.slice(0, maxLength)
  }

  return `${value.slice(0, maxLength - suffix.length).trimEnd()}${suffix}`
}
