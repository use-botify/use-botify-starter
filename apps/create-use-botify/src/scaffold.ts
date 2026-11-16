import { spawn } from "node:child_process"
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { styleText } from "node:util"

import * as p from "@clack/prompts"

import {
  links,
  resolveDependencies,
  resolveScripts,
} from "@/config/project.config"
import { runCliPrompts } from "@/prompts"

function run(cwd: string, command: string, args: string[]) {
  const line = [command, ...args.map((arg) => `"${arg}"`)].join(" ")

  return new Promise<void>((resolve, reject) => {
    const child = spawn(line, { cwd, shell: true, stdio: "pipe" })
    let output = ""

    child.stdout.on("data", (chunk) => (output += chunk))
    child.stderr.on("data", (chunk) => (output += chunk))
    child.on("error", reject)
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(
            new Error(`\`${line}\` exited with code ${code}\n${output.trim()}`)
          )
    )
  })
}

async function install(
  cwd: string,
  label: string,
  packages: string[],
  dev: boolean
) {
  if (packages.length === 0) return

  p.log.step(
    `Installing ${label}:\n${packages.map((name) => `- ${name}`).join("\n")}`
  )

  const spinner = p.spinner()
  spinner.start(`pnpm add${dev ? " -D" : ""}`)

  try {
    await run(cwd, "pnpm", [
      "add",
      "--save-exact",
      ...(dev ? ["--save-dev"] : []),
      ...packages,
    ])
    spinner.stop(`Installed ${label}`)
  } catch (error) {
    spinner.error(`Failed to install ${label}`)
    throw error
  }
}

// pnpm keeps the range when a spec has one (prisma@7 -> ^7.10.1), so strip the
// prefix afterwards to honour the save-exact convention.
async function pinVersions(dir: string) {
  const file = path.join(dir, "package.json")
  const manifest = JSON.parse(await readFile(file, "utf8")) as Record<
    "dependencies" | "devDependencies",
    Record<string, string> | undefined
  >

  for (const field of ["dependencies", "devDependencies"] as const) {
    for (const [name, range] of Object.entries(manifest[field] ?? {})) {
      manifest[field]![name] = range.replace(/^[\^~]/, "")
    }
  }

  await writeFile(file, JSON.stringify(manifest, null, 2) + "\n")
}

async function assertEmpty(dir: string) {
  const entries = await readdir(dir).catch(() => [] as string[])
  if (entries.some((name) => name !== ".git")) {
    throw new Error(
      `${dir} is not empty. Choose another name or an empty folder.`
    )
  }
}

const toPackageName = (dir: string) =>
  path
    .basename(dir)
    .toLowerCase()
    .replace(/[^a-z0-9._~-]/g, "-")

export async function scaffoldProject() {
  const answers = await runCliPrompts()
  const targetDir = path.resolve(process.cwd(), answers.projectName)

  await assertEmpty(targetDir)

  p.log.info(`Creating a new Botify app in ${styleText("green", targetDir)}`)
  p.log.info("Using pnpm.")
  p.log.step("Initializing project with template:-")

  await mkdir(targetDir, { recursive: true })
  await writeFile(
    path.join(targetDir, "package.json"),
    JSON.stringify(
      {
        name: toPackageName(targetDir),
        version: "0.1.0",
        private: true,
        type: "module",
        engines: { node: ">=24.0.0" },
        scripts: resolveScripts(answers),
      },
      null,
      2
    ) + "\n"
  )

  // The template copy lands here in the templates step (apps/templates).

  const { dependencies, devDependencies, allowBuilds } =
    resolveDependencies(answers)

  if (allowBuilds.length > 0) {
    await writeFile(
      path.join(targetDir, "pnpm-workspace.yaml"),
      `allowBuilds:\n${allowBuilds.map((name) => `  "${name}": true`).join("\n")}\n`
    )
  }

  await install(targetDir, "dependencies", dependencies, false)
  await install(targetDir, "devDependencies", devDependencies, true)
  await pinVersions(targetDir)

  p.log.success("Hey your project created successfully")
  p.log.message(
    [
      `- Visit the docs: ${styleText("cyan", links.docs)}`,
      `- Also visit GitHub: ${styleText("cyan", links.github)}`,
    ].join("\n")
  )
  p.outro(
    `Created by ${styleText("bold", "sahilkumardev")} and powered by ${styleText("bold", "axisbuddy")}`
  )
}
