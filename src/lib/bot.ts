import { Bot, type Context } from "grammy";
import { env } from "@/config/env";

export const bot = new Bot<Context>(env.TELEGRAM_BOT_TOKEN);
