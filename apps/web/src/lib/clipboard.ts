function legacyCopyToClipboard(value: string): boolean {
  const textArea = document.createElement("textarea")
  textArea.value = value
  textArea.setAttribute("readonly", "")
  textArea.style.position = "fixed"
  textArea.style.inset = "0"
  textArea.style.opacity = "0"
  textArea.style.pointerEvents = "none"

  const activeElement = document.activeElement as HTMLElement | null
  document.body.appendChild(textArea)
  textArea.focus({ preventScroll: true })
  textArea.select()
  textArea.setSelectionRange(0, value.length)

  let copied = false

  try {
    copied = document.execCommand("copy")
  } catch {
    copied = false
  } finally {
    textArea.remove()
    activeElement?.focus({ preventScroll: true })
  }

  return copied
}

export async function copyToClipboard(value: string): Promise<boolean> {
  if (!value || typeof window === "undefined") {
    return false
  }

  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      return legacyCopyToClipboard(value)
    }
  }

  return legacyCopyToClipboard(value)
}
