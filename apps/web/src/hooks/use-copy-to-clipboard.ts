"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { copyToClipboard } from "@/lib/clipboard"

export function useCopyToClipboard(timeoutMs = 2000) {
  const [hasCopied, setHasCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => clearTimer, [clearTimer])

  const copy = useCallback(
    async (value: string): Promise<boolean> => {
      const copied = await copyToClipboard(value)
      if (!copied) return false

      setHasCopied(true)
      clearTimer()
      timerRef.current = setTimeout(() => {
        setHasCopied(false)
        timerRef.current = null
      }, timeoutMs)

      return true
    },
    [clearTimer, timeoutMs]
  )

  return { hasCopied, copy } as const
}
