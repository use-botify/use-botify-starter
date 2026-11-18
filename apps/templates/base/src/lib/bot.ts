import { Bot, type Context } from "grammy"

import { env } from "@/configs/env.config"

export type BotContext = Context

export const bot = new Bot<BotContext>(env.TELEGRAM_BOT_TOKEN)
