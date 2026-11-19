import { defaultRegistry } from "./lib/default-registry";

export { escapeHtml } from "@workspace/utils";

export { createIconRegistry } from "./lib/create-icon-registry";
export { defaultRegistry } from "./lib/default-registry";
export { buildCallbackButton, buildUrlButton } from "./lib/icon-buttons";
export { createIcon, renderIconTag } from "./lib/render-icon";
export { assertIconDetail, isIconDetail } from "./lib/validate-icon";
export { defineIcons } from "./registry/default-icons";
export { normalizeIconKey } from "./utils/normalize-icon-key";

export const {
  findIcon,
  getIcon,
  renderIcon,
  iconCallbackButton,
  iconUrlButton,
} = defaultRegistry;
