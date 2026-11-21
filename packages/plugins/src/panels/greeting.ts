import { escapeHtml } from "@workspace/utils"

import type { BuildPanelGreetingOptions } from "../types/panel.types"
import { formatUserMention } from "./user-mention"

/**
 * Builds a clean HTML greeting header for role panels (`parse_mode: "HTML"`).
 */
export function buildPanelGreeting(options: BuildPanelGreetingOptions): string {
  const prefix = escapeHtml(options.prefix ?? "Hey")
  const mention = formatUserMention(options.user, options.fallbackMention)
  const heading = options.role
    ? `${prefix} ${escapeHtml(options.role)}, <b>${mention}</b>`
    : `${prefix}, <b>${mention}</b>`

  if (!options.description) {
    return heading
  }

  return `${heading}\n\n${options.description}`
}
