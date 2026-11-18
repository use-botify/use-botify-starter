/**
 * @import commands and callbacks under this
 */
import {
  publicStartCallback,
  publicStartCommand,
} from "@/features/public/start"
import { defineCallback, defineCommand, defineFeature } from "@/core"

import { PUBLIC_ROUTES } from "./public.route"

export const publicFeature = defineFeature({
  name: "public",
  access: "public",
  commands: [
    defineCommand({
      name: "start",
      access: "public",
      description: "Open the main menu",
      handler: publicStartCommand,
    }),
  ],
  callbacks: [
    defineCallback({
      route: PUBLIC_ROUTES.start,
      access: "public",
      handler: publicStartCallback,
    }),
  ],
})
