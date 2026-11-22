import { BOTIFY_PACKAGES } from "@/lib/ecosystem"
import { source } from "@/lib/source"

export const revalidate = false

export function GET() {
  const pages = source.getPages()

  const lines: string[] = [
    "# Use Botify",
    "",
    "> Modular TypeScript framework and CLI scaffolder for Next.js-style grammY Telegram bots with Vite feature HMR.",
    "",
    "## Quick Start",
    "",
    "- `pnpm create use-botify`",
    "- `npx create-use-botify@latest`",
    "- `bun create use-botify`",
    "",
    "## Documentation",
    "",
    ...pages.map((page) => {
      const description = page.data.description
        ? `: ${page.data.description}`
        : ""
      return `- [${page.data.title}](${page.url})${description}`
    }),
    "",
    "## Packages",
    "",
    ...BOTIFY_PACKAGES.map(
      (pkg) =>
        `- **${pkg.name}** (v${pkg.version}) — ${pkg.summary} Install: \`${pkg.installCommand}\` | Docs: ${pkg.docsUrl} | npm: ${pkg.npmUrl}`
    ),
    "",
  ]

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  })
}
