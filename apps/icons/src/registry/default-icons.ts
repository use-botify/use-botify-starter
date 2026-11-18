import type { IconDetail } from "@/registry/icon.types"

// The single source of truth for every icon Botify ships.
// To add one, capture it with /grab_icon in a bot and paste the entry here.
export const DEFAULT_ICONS = {
  chat: {
    key: "chat",
    customEmojiId: "5443038326535759644",
    fallback: "💬",
    entity: { offset: 0, length: 2 },
    capturedAt: "2026-10-27T09:46:19.348Z",
  },
  settings: {
    key: "settings",
    customEmojiId: "5341715473882955310",
    fallback: "⚙️",
    entity: { offset: 0, length: 2 },
    capturedAt: "2026-10-27T09:46:58.686Z",
  },
  close: {
    key: "close",
    customEmojiId: "5210952531676504517",
    fallback: "❌",
    entity: { offset: 0, length: 2 },
    capturedAt: "2026-10-27T09:47:31.307Z",
  },
  shield: {
    key: "shield",
    customEmojiId: "5251203410396458957",
    fallback: "🛡",
    entity: { offset: 0, length: 2 },
    capturedAt: "2026-10-27T11:30:40.084Z",
  },
  alert: {
    key: "alert",
    customEmojiId: "5395695537687123235",
    fallback: "🚨",
    entity: { offset: 0, length: 2 },
    capturedAt: "2026-10-27T11:31:47.117Z",
  },
  flash: {
    key: "flash",
    customEmojiId: "5224607267797606837",
    fallback: "☄️",
    entity: { offset: 0, length: 2 },
    capturedAt: "2026-10-27T12:23:24.354Z",
  },
  pencil: {
    key: "pencil",
    customEmojiId: "5395444784611480792",
    fallback: "✏️",
    entity: { offset: 0, length: 2 },
    capturedAt: "2026-10-27T12:52:01.912Z",
  },
  buy: {
    key: "buy",
    customEmojiId: "5431461452642806959",
    fallback: "🛒",
    entity: { offset: 0, length: 2 },
    capturedAt: "2026-10-27T16:55:52.500Z",
  },
  diamond: {
    key: "diamond",
    customEmojiId: "5431761159755688084",
    fallback: "💎",
    entity: { offset: 0, length: 2 },
    capturedAt: "2026-10-27T16:56:10.722Z",
  },
  back: {
    key: "back",
    customEmojiId: "5935829907572529929",
    fallback: "⬅️",
    entity: { offset: 0, length: 2 },
    capturedAt: "2026-10-27T17:01:54.165Z",
  },
  usdt: {
    key: "usdt",
    customEmojiId: "5370638969065221371",
    fallback: "🟠",
    entity: { offset: 0, length: 2 },
    capturedAt: "2026-10-28T13:45:57.148Z",
  },
  ethereum: {
    key: "ethereum",
    customEmojiId: "5371015538912835062",
    fallback: "💎",
    entity: { offset: 0, length: 2 },
    capturedAt: "2026-10-28T13:46:16.118Z",
  },
  solana: {
    key: "solana",
    customEmojiId: "5370932637454084263",
    fallback: "💜",
    entity: { offset: 0, length: 2 },
    capturedAt: "2026-10-28T13:47:34.815Z",
  },
  ton: {
    key: "ton",
    customEmojiId: "5305758346983286417",
    fallback: "💎",
    entity: { offset: 0, length: 2 },
    capturedAt: "2026-10-28T13:48:11.504Z",
  },
  saved: {
    key: "saved",
    customEmojiId: "5222444124698853913",
    fallback: "🔖",
    entity: { offset: 0, length: 2 },
    capturedAt: "2026-10-29T13:59:00.673Z",
  },
  delete: {
    key: "delete",
    customEmojiId: "5445267414562389170",
    fallback: "🗑",
    entity: { offset: 0, length: 2 },
    capturedAt: "2026-10-29T13:59:17.842Z",
  },
  add: {
    key: "add",
    customEmojiId: "5397916757333654639",
    fallback: "➕",
    entity: { offset: 0, length: 1 },
    capturedAt: "2026-10-29T13:59:29.993Z",
  },
} as const satisfies Record<string, IconDetail>

export type RegisteredIconKey = keyof typeof DEFAULT_ICONS

export type IconName = RegisteredIconKey

export type IconKey = IconName
