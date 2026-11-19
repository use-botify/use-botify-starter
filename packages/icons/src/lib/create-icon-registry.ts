import { DEFAULT_ICONS, type DefaultIconKey } from "../registry/default-icons";
import type {
  Icon,
  IconDetail,
  IconInput,
  IconRegistry,
  KeyedIconRecord,
} from "../types/icon.types";
import { buildCallbackButton, buildUrlButton } from "./icon-buttons";
import { createIcon, renderIconTag } from "./render-icon";
import { assertIconDetail } from "./validate-icon";

/**
 * Builds typed icon helpers over `DEFAULT_ICONS` plus any custom bot icons.
 *
 * Passing an icon in `extra` with the same key as a default overrides it.
 * All custom entries are validated up front via `assertIconDetail`.
 */
export function createIconRegistry(
  extra?: undefined,
): IconRegistry<DefaultIconKey>;
export function createIconRegistry<
  const TExtra extends Record<string, IconDetail>,
>(
  extra: KeyedIconRecord<TExtra>,
): IconRegistry<DefaultIconKey | Extract<keyof TExtra, string>>;
export function createIconRegistry(
  extra?: Record<string, IconDetail>,
): IconRegistry<string> {
  if (extra) {
    for (const [key, icon] of Object.entries(extra)) {
      assertIconDetail(key, icon);
    }
  }

  const merged: Record<string, IconDetail> = {
    ...DEFAULT_ICONS,
    ...extra,
  };

  const icons: Record<string, Icon> = {};
  for (const [key, detail] of Object.entries(merged)) {
    icons[key] = createIcon(detail);
  }
  Object.freeze(icons);

  const findIcon = (key: string): Icon | undefined =>
    Object.hasOwn(icons, key) ? icons[key] : undefined;

  const getIcon = <K extends string>(key: K): Icon<K> => {
    const icon = findIcon(key);
    if (!icon) {
      throw new Error(`Unknown icon: "${key}"`);
    }
    return icon as Icon<K>;
  };

  const resolveOptionalIcon = (
    input: IconInput<string> | undefined,
  ): IconDetail | undefined => {
    if (input === undefined) {
      return undefined;
    }
    return typeof input === "string" ? findIcon(input) : input;
  };

  return {
    icons,
    findIcon,
    getIcon,
    renderIcon: (input) => {
      if (typeof input === "string") {
        return getIcon(input).html;
      }
      return "html" in input && typeof input.html === "string"
        ? input.html
        : renderIconTag(input);
    },
    iconCallbackButton: (input, text, callbackData = "noop") =>
      buildCallbackButton(resolveOptionalIcon(input), text, callbackData),
    iconUrlButton: (input, text, url) =>
      buildUrlButton(resolveOptionalIcon(input), text, url),
  };
}
