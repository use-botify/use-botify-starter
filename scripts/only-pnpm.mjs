import process from "node:process"

const userAgent = process.env.npm_config_user_agent ?? ""

if (!userAgent.startsWith("pnpm/")) {
  const detected = userAgent.split(" ")[0] || "another package manager"

  process.stderr.write(
    `\n[use-botify] This repository requires pnpm (detected: ${detected}).\n` +
      "Run `pnpm install` instead.\n\n"
  )
  process.exit(1)
}
