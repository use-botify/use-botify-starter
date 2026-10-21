import { Context } from "grammY";

export interface BaseHandler {
  description: string;
  handler: (ctx: Context) => Promise<void>;
  isPublic?: boolean;
}

export interface CommandHandler extends BaseHandler {
  command: string;
}

export interface CallbackHandler extends BaseHandler {
  callbackData: string;
}
