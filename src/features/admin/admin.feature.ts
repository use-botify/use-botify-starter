import { defineCommand, defineFeature } from "@/core";
/**
 * @import commands and callbacks under this
 */
import { adminPanelCommand } from "@/features/admin/panel";

export const adminFeature = defineFeature({
  name: "admin",
  access: "admin",
  commands: [
    defineCommand({
      name: "panel",
      access: "admin",
      description: "Open the admin control panel",
      handler: adminPanelCommand,
    }),
  ],
});
