
import { defaultRegistry } from "@/lib/default-registry"

export {
  createIconRegistry,
  type IconRegistry,
} from "@/lib/create-icon-registry"
export type { IconCallbackButton, IconUrlButton } from "@/lib/icon-buttons"
export { assertIconDetail, isIconDetail } from "@/lib/validate-icon"
export {
  DEFAULT_ICONS,
  type IconKey,
  type IconName,
  type RegisteredIconKey,
} from "@/registry/default-icons"
export type {
  IconDetail,
  IconEntityPosition,
  IconSourceMessage,
  IconStickerDetail,
  IconStickerFormat,
} from "@/registry/icon.types"
export { normalizeIconKey } from "@/utils/normalize-icon-key"

export const {
  findIcon,
  getIcon,
  renderIcon,
  iconCallbackButton,
  iconUrlButton,
} = defaultRegistry

/** @deprecated Use `iconCallbackButton`. Same function, kept for old imports. */
export const iconInlineButton = iconCallbackButton