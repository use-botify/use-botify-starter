import { escapeHtml } from "@workspace/utils"
import { type Context, InlineKeyboard } from "grammy"

import type {
  BuildGuidePanelOptions,
  BuiltGuidePanel,
  GuidePanel,
  GuidePanelButtonBuilder,
  GuidePanelItem,
  GuidePanelNavigation,
} from "../types/panel.types"

const defaultButtonBuilder: GuidePanelButtonBuilder = (
  _kind,
  text,
  callbackData
) => ({
  text,
  callback_data: callbackData,
})

/**
 * Safe lookup for a guide entry by key (guards against prototype keys).
 */
export function getGuidePanelItem<C extends Context, T extends GuidePanel<C>>(
  guides: T,
  key: string
): T[keyof T] | undefined {
  if (!Object.hasOwn(guides, key)) {
    return undefined
  }

  return guides[key as keyof T]
}

/**
 * Builds an HTML command guide message (`parse_mode: "HTML"`) and matching
 * inline keyboard with optional "Execute Command" and "Back" buttons.
 */
export function buildGuidePanel<C extends Context = Context>(
  guide: GuidePanelItem<C>,
  navigation: GuidePanelNavigation,
  options: BuildGuidePanelOptions = {}
): BuiltGuidePanel {
  const buildButton = options.buildButton ?? defaultButtonBuilder
  const executeLabel = options.executeLabel ?? "Execute Command"
  const backLabel = options.backLabel ?? "Back"

  const keyboard = new InlineKeyboard()

  if (navigation.execute) {
    keyboard.add(buildButton("execute", executeLabel, navigation.execute)).row()
  }

  keyboard.add(buildButton("back", backLabel, navigation.back))

  const sections: string[] = [
    `<b>Command:</b> <code>${escapeHtml(guide.route)}</code>`,
  ]

  if (guide.useCase) {
    sections.push(`<b>USE CASE</b>\n${escapeHtml(guide.useCase)}`)
  }

  if (guide.steps.length > 0) {
    const formattedSteps = guide.steps
      .map((step, index) => `${index + 1}. ${escapeHtml(step)}`)
      .join("\n")
    sections.push(`<b>HOW TO USE</b>\n${formattedSteps}`)
  }

  return Object.freeze<BuiltGuidePanel>({
    text: sections.join("\n\n"),
    keyboard,
  })
}
