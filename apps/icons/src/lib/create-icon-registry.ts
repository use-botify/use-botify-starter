import {
  buildCallbackButton,
  buildUrlButton,
  type IconCallbackButton,
  type IconUrlButton,
} from "@/lib/icon-buttons"
import { renderIconTag } from "@/lib/render-icon"
import { assertIconDetail } from "@/lib/validate-icon"
import { DEFAULT_ICONS, type RegisteredIconKey } from "@/registry/default-icons"
import type { IconDetail } from "@/registry/icon.types"

export type IconRegistry<TKey extends string = string> = {
  /** Every icon in this registry, defaults first, then your own. */
  readonly icons: Readonly<Record<TKey, IconDetail>>
  findIcon(key: TKey): IconDetail | undefined
  /** Throws `Unknown icon: <key>` when the key is not registered. */
  getIcon(key: TKey): IconDetail
  /** Telegram HTML `<tg-emoji>` tag. Use with `parse_mode: "HTML"`. */
  renderIcon(key: TKey): string
  iconCallbackButton(
    key: TKey,
    text: string,
    callbackData?: string
  ): IconCallbackButton
  iconUrlButton(key: TKey, text: string, url: string): IconUrlButton
}

/**
 * Builds the icon helpers over the default icons plus your own.
 *
 * An icon in `extra` that has the same key as a default replaces it, so a bot
 * can override a shipped icon with its own. Entries are validated up front.
 */
export function createIconRegistry<
  TExtra extends Record<string, IconDetail> = Record<never, IconDetail>,
>(extra?: TExtra): IconRegistry<RegisteredIconKey | (keyof TExtra & string)> {
  type TKey = RegisteredIconKey | (keyof TExtra & string)

  for (const [key, icon] of Object.entries(extra ?? {})) {
    assertIconDetail(key, icon)
  }

  const icons = { ...DEFAULT_ICONS, ...extra } as Readonly<
    Record<TKey, IconDetail>
  >

  const findIcon = (key: TKey): IconDetail | undefined =>
    Object.hasOwn(icons, key) ? icons[key] : undefined

  const getIcon = (key: TKey): IconDetail => {
    const icon = findIcon(key)
    if (!icon) throw new Error(`Unknown icon: ${key}`)
    return icon
  }

  return {
    icons,
    findIcon,
    getIcon,
    renderIcon: (key) => renderIconTag(getIcon(key)),
    iconCallbackButton: (key, text, callbackData = "noop") =>
      buildCallbackButton(findIcon(key), text, callbackData),
    iconUrlButton: (key, text, url) => buildUrlButton(findIcon(key), text, url),
  }
}
