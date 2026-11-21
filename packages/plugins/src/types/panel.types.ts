import type { CallbackQueryContext, Context, InlineKeyboard } from "grammy"
import type { User } from "grammy/types"

export type MentionableUser = Pick<User, "username" | "first_name">

export interface PanelCallbackButton {
  text: string
  callback_data: string
  icon_custom_emoji_id?: string
}

export type GuidePanelButtonKind = "execute" | "back"

export type GuidePanelButtonBuilder = (
  kind: GuidePanelButtonKind,
  label: string,
  callbackData: string
) => PanelCallbackButton

export interface GuidePanelItem<C extends Context = Context> {
  readonly route: string
  readonly useCase?: string
  readonly steps: readonly string[]
  readonly execute?: (ctx: CallbackQueryContext<C>) => void | Promise<void>
}

export type GuidePanel<C extends Context = Context> = Readonly<
  Record<string, GuidePanelItem<C>>
>

export interface GuidePanelNavigation {
  readonly execute?: string
  readonly back: string
}

export interface BuildGuidePanelOptions {
  /** Label for the optional execute button. Defaults to `"Execute Command"`. */
  readonly executeLabel?: string
  /** Label for the back button. Defaults to `"Back"`. */
  readonly backLabel?: string
  /**
   * Optional button factory (compatible with `@use-botify/icons`'s
   * `iconCallbackButton`) for attaching custom Telegram emoji icons.
   */
  readonly buildButton?: GuidePanelButtonBuilder
}

export interface BuiltGuidePanel {
  readonly text: string
  readonly keyboard: InlineKeyboard
}

export interface BuildPanelGreetingOptions {
  /** Optional role label shown after the greeting prefix (e.g. `"admin"`, `"developer"`). */
  readonly role?: string
  /** Telegram user to mention in bold HTML. */
  readonly user?: MentionableUser
  /** Optional body paragraph appended after a blank line. */
  readonly description?: string
  /** Greeting prefix. Defaults to `"Hey"`. */
  readonly prefix?: string
  /** Fallback mention string when `user` is omitted. Defaults to `"@user"`. */
  readonly fallbackMention?: string
}

export interface CloseMessageOptions {
  /** Optional toast text passed to `answerCallbackQuery`. */
  readonly answerText?: string
  /** Remove the inline keyboard if Telegram rejects `deleteMessage` (e.g. >48h old). Defaults to `true`. */
  readonly fallbackClearMarkup?: boolean
}
