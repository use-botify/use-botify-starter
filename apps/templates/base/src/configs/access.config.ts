export const ACCESS_LEVELS = ["public", "admin", "developer"] as const

export type Access = (typeof ACCESS_LEVELS)[number]

export const ACCESS_RANK = Object.fromEntries(
  ACCESS_LEVELS.map((level, index) => [level, index])
) as Record<Access, number>

export type UserRole = Exclude<Access, "public"> | "user"
