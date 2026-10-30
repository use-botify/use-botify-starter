import { defineCommand, defineFeature } from "@/core";
/**
 * @import commands and callbacks under this
 */
import {
  developerAddIconCommand,
  developerListIconCommand,
  developerRemoveIconCommand,
} from "@/features/developer/icon";
import { developerDevtoolsCommand } from "@/features/developer/devtools";

export const developerFeature = defineFeature({
  name: "developer",
  access: "developer",
  commands: [
    defineCommand({
      name: "devtools",
      access: "developer",
      description: "Developer tools",
      handler: developerDevtoolsCommand,
    }),
    defineCommand({
      name: "list_icons",
      access: "developer",
      description: "List icons saved in the library",
      handler: developerListIconCommand,
    }),
    defineCommand({
      name: "add_icon",
      access: "developer",
      description: "Add an icon to the library",
      handler: developerAddIconCommand,
    }),
    defineCommand({
      name: "remove_icon",
      access: "developer",
      description: "Remove an icon from the library",
      handler: developerRemoveIconCommand,
    }),
  ],
});
