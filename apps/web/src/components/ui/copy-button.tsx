"use client"

import { Check, Copy } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "cn"
import * as React from "react"

import { Button } from "@/components/ui/button"

function legacyCopyToClipboard(value: string) {
  const textArea = document.createElement("textarea")

  textArea.value = value
  textArea.setAttribute("readonly", "")
  textArea.style.position = "fixed"
  textArea.style.opacity = "0"
  textArea.style.pointerEvents = "none"

  document.body.appendChild(textArea)

  textArea.focus()
  textArea.select()
  textArea.setSelectionRange(0, value.length)

  let copied = false

  try {
    copied = document.execCommand("copy")
  } catch {
    copied = false
  }

  document.body.removeChild(textArea)

  return copied
}

export async function copyToClipboard(value: string) {
  if (!value || typeof window === "undefined") {
    return false
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      return legacyCopyToClipboard(value)
    }
  }

  return legacyCopyToClipboard(value)
}

export function CopyButton({
  value,
  className,
  variant = "ghost",
  ...props
}: React.ComponentProps<typeof Button> & {
  value: string
}) {
  const [hasCopied, setHasCopied] = React.useState(false)

  React.useEffect(() => {
    if (!hasCopied) return

    const timer = setTimeout(() => {
      setHasCopied(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [hasCopied])

  const handleCopy = async () => {
    const copied = await copyToClipboard(value)

    if (copied) {
      setHasCopied(true)
    }
  }

  return (
    <Button
      data-slot="copy-button"
      data-copied={hasCopied}
      size="icon"
      variant={variant}
      className={cn(
        "absolute top-3 right-2 z-10 size-7 bg-code hover:opacity-100 focus-visible:opacity-100",
        className
      )}
      onClick={handleCopy}
      {...props}
    >
      <span className="sr-only">Copy</span>

      <HugeiconsIcon icon={hasCopied ? Check : Copy} />
    </Button>
  )
}
