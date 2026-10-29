import { InlineKeyboard } from "grammy";
import type { User } from "grammy/types";

import type { Build_Mode } from "@/core/route.core";
import { iconCallbackButton } from "@/lib/icons";

import { DEVELOPER_ROUTES } from "@/features/developer/developer.route";

export function buildDevtoolsKeyboard(mode: Build_Mode): InlineKeyboard {
  if (mode === "start") {
    return new InlineKeyboard().add(iconCallbackButton("back", "Back"));
  }

  return new InlineKeyboard()
    .add(iconCallbackButton("settings", "Saved Icon"))
    .add(iconCallbackButton("settings", "Add Icon"))
    .row()
    .add(iconCallbackButton("settings", "Remove Icon"))
    .row()
    .add(iconCallbackButton("close", "Close", DEVELOPER_ROUTES.close.build()));
}
