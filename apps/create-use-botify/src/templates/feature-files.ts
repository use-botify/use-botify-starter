import { getAliasPrefix } from "../lib/schema"
import type { GeneratedFile, ScaffoldOptions } from "../types/cli.types"

function featurePath(options: ScaffoldOptions, relativePath: string): string {
  const base = options.useSrcDir ? "src/features" : "features"
  return `${base}/${relativePath}`
}

function renderStartCommand(): string {
  return [
    'import { type CommandContext, type Context, InlineKeyboard } from "grammy"',
    "",
    'export const description = "Start the bot"',
    "",
    "export default async function startCommand(",
    "  ctx: CommandContext<Context>",
    "): Promise<void> {",
    '  const keyboard = new InlineKeyboard().text("Check Status", "start:ping")',
    "",
    "  await ctx.reply(",
    '    "<b>Welcome!</b> Your Botify Telegram bot is up and running.",',
    "    {",
    '      parse_mode: "HTML",',
    "      reply_markup: keyboard,",
    "    }",
    "  )",
    "}",
    "",
  ].join("\n")
}
function renderStartPingCallback(): string {
  const dollar = "$"

  return [
    'import process from "node:process"',
    "",
    'import type { CallbackQueryContext, Context } from "grammy"',
    "",
    "export default async function startPingCallback(",
    "  ctx: CallbackQueryContext<Context>",
    "): Promise<void> {",
    '  await ctx.answerCallbackQuery({ text: "Bot is online!" })',
    "  const uptime = Math.floor(process.uptime())",
    "  await ctx.editMessageText(",
    `    \`<b>Status:</b> Online\\n<b>Uptime:</b> ${dollar}{uptime}s\`,`,
    '    { parse_mode: "HTML" }',
    "  )",
    "}",
    "",
  ].join("\n")
}

function renderAdminPanelCommand(options: ScaffoldOptions): string {
  const alias = getAliasPrefix(options.importAlias)

  return [
    'import { buildPanelGreeting } from "@use-botify/plugins/panels"',
    'import { type CommandContext, type Context, InlineKeyboard } from "grammy"',
    "",
    `import { isAdmin } from "${alias}lib/access"`,
    "",
    'export const description = "Open the admin panel"',
    "",
    "export default async function adminPanelCommand(",
    "  ctx: CommandContext<Context>",
    "): Promise<void> {",
    "  if (!isAdmin(ctx.from?.id)) {",
    '    await ctx.reply("You do not have permission to access this panel.")',
    "    return",
    "  }",
    "",
    "  const text = buildPanelGreeting({",
    '    role: "admin",',
    "    user: ctx.from,",
    '    description: "Manage your bot settings and moderation actions below.",',
    "  })",
    "",
    '  const keyboard = new InlineKeyboard().text("Close", "panel:close")',
    "",
    "  await ctx.reply(text, {",
    '    parse_mode: "HTML",',
    "    reply_markup: keyboard,",
    "  })",
    "}",
    "",
  ].join("\n")
}

function renderAdminPanelCloseCallback(options: ScaffoldOptions): string {
  const alias = getAliasPrefix(options.importAlias)

  return [
    'import { closeMessageCallback } from "@use-botify/plugins/panels"',
    'import type { CallbackQueryContext, Context } from "grammy"',
    "",
    `import { isAdmin } from "${alias}lib/access"`,
    "",
    "export default async function adminPanelCloseCallback(",
    "  ctx: CallbackQueryContext<Context>",
    "): Promise<void> {",
    "  if (!isAdmin(ctx.from?.id)) {",
    '    await ctx.answerCallbackQuery({ text: "Unauthorized", show_alert: true })',
    "    return",
    "  }",
    "",
    '  await closeMessageCallback(ctx, { answerText: "Panel closed" })',
    "}",
    "",
  ].join("\n")
}

function renderDeveloperIconCommand(
  options: ScaffoldOptions,
  spec: {
    readonly fnName: string
    readonly description: string
    readonly method: "handleAddIcon" | "handleListIcons" | "handleRemoveIcon"
  }
): string {
  const alias = getAliasPrefix(options.importAlias)

  return [
    'import type { CommandContext, Context } from "grammy"',
    "",
    `import { isDeveloper } from "${alias}lib/access"`,
    `import { iconTools } from "${alias}lib/icons"`,
    "",
    `export const description = ${JSON.stringify(spec.description)}`,
    "",
    `export default async function ${spec.fnName}(`,
    "  ctx: CommandContext<Context>",
    "): Promise<void> {",
    "  if (!isDeveloper(ctx.from?.id)) {",
    '    await ctx.reply("Developer access required.")',
    "    return",
    "  }",
    "",
    `  await iconTools.${spec.method}(ctx)`,
    "}",
    "",
  ].join("\n")
}

export function renderFeatureFiles(
  options: ScaffoldOptions
): readonly GeneratedFile[] {
  const files: GeneratedFile[] = [
    {
      path: featurePath(options, "start/command.ts"),
      content: renderStartCommand(),
    },
    {
      path: featurePath(options, "start/ping.callback.ts"),
      content: renderStartPingCallback(),
    },
  ]

  if (options.features.admin) {
    files.push(
      {
        path: featurePath(options, "(admin)/panel/command.ts"),
        content: renderAdminPanelCommand(options),
      },
      {
        path: featurePath(options, "(admin)/panel/close.callback.ts"),
        content: renderAdminPanelCloseCallback(options),
      }
    )
  }

  if (options.features.developer) {
    files.push(
      {
        path: featurePath(options, "(developer)/add_icon/command.ts"),
        content: renderDeveloperIconCommand(options, {
          fnName: "addIconCommand",
          description: "Register a custom Telegram emoji icon",
          method: "handleAddIcon",
        }),
      },
      {
        path: featurePath(options, "(developer)/list_icons/command.ts"),
        content: renderDeveloperIconCommand(options, {
          fnName: "listIconsCommand",
          description: "List registered custom emoji icons",
          method: "handleListIcons",
        }),
      },
      {
        path: featurePath(options, "(developer)/remove_icon/command.ts"),
        content: renderDeveloperIconCommand(options, {
          fnName: "removeIconCommand",
          description: "Remove a registered custom emoji icon",
          method: "handleRemoveIcon",
        }),
      }
    )
  }

  return files
}
