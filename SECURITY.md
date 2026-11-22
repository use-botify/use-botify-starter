# Security Policy

## Supported Versions

Security fixes are applied to the latest published versions of `create-use-botify` and all `@use-botify/*` packages.

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please report them privately using GitHub's Private Vulnerability Reporting:

1. Go to the **Security** tab of `use-botify/use-botify-starter`.
2. Click **Advisories** → **Report a vulnerability**.
3. Include affected package name(s) and version(s), reproduction steps, and any suggested fix.

You can expect an acknowledgment within **72 hours**, and we will coordinate a fix and disclosure timeline with you once confirmed.

## Bot Token Safety

If you are building a bot with Use Botify, never commit `.env` files or hardcode `BOT_TOKEN`, `ADMIN_IDS`, or `DEVELOPER_IDS` in public repositories. If a Telegram bot token is ever exposed, revoke it immediately via `@BotFather`.
