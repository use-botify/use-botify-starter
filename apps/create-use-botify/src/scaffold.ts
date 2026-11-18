import { spawn } from "node:child_process"
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises"
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

// Recursive text replacement for Import Aliases and Src Paths
async function replaceInFiles(dir: string, search: string, replace: string) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await replaceInFiles(fullPath, search, replace)
    } else if (/\.(ts|tsx|json|md|mjs)$/.test(entry.name)) {
      const content = await readFile(fullPath, "utf8")
      if (content.includes(search)) {
        await writeFile(fullPath, content.replaceAll(search, replace))
      }
    }
  }
}

export async function scaffoldProject() {
  const answers = await runCliPrompts()

  // Navigate out of apps/create-use-botify to the monorepo root
  const monorepoRoot = path.resolve(process.cwd(), "../../")
  const projectRoot = path.resolve(monorepoRoot, "test")

  // Resolve the target directory relative to the monorepo root
  const targetDir = path.resolve(projectRoot, answers.projectName)

  await assertEmpty(targetDir)

  p.log.info(`Creating a new Botify app in ${styleText("green", targetDir)}`)
  p.log.info("Using pnpm.")
  p.log.step("Copying template files...")

  await mkdir(targetDir, { recursive: true })

  // 1. Resolve template directory from the monorepo root
  const templateDir = path.resolve(monorepoRoot, "apps/templates/base")

  await cp(templateDir, targetDir, {
    recursive: true,
    filter: (src) => {
      const name = path.basename(src)
      return !["node_modules", ".git", "dist", "coverage"].includes(name)
    },
  })

  // 2. Isolate Project from Monorepo (Crucial for pnpm install to work locally)
  const { dependencies, devDependencies, allowBuilds } =
    resolveDependencies(answers)

  await writeFile(
    path.join(targetDir, "pnpm-workspace.yaml"),
    `packages:\n  - "."\nallowBuilds:\n${allowBuilds.map((name) => `  "${name}": true`).join("\n")}\n`
  )
  await writeFile(
    path.join(targetDir, ".npmrc"),
    "save-exact=true\nengine-strict=true\nignore-workspace=true\n"
  )

  // 3. Merge & Overwrite package.json (Keep template dependencies like pino, pg, etc.)
  const templatePkgPath = path.join(targetDir, "package.json")
  let templatePkg = { dependencies: {}, devDependencies: {} }
  try {
    templatePkg = JSON.parse(await readFile(templatePkgPath, "utf8"))
  } catch {
    //
  }

  const finalPkg = {
    name:
      answers.projectName === "./"
        ? path.basename(process.cwd())
        : toPackageName(targetDir),
    version: "0.1.0",
    private: true,
    type: "module",
    engines: { node: ">=24.0.0" },
    scripts: resolveScripts(answers),
    dependencies: templatePkg.dependencies || {},
    devDependencies: templatePkg.devDependencies || {},
  }
  await writeFile(templatePkgPath, JSON.stringify(finalPkg, null, 2) + "\n")

  // 4. File Cleanups & Formatting based on answers
  if (answers.linter === "biome") {
    await rm(path.join(targetDir, "eslint.config.mjs"), { force: true }).catch(
      () => {}
    )
    await rm(path.join(targetDir, "prettier.config.mjs"), {
      force: true,
    }).catch(() => {})
  } else {
    await rm(path.join(targetDir, "biome.json"), { force: true }).catch(
      () => {}
    )
  }

  if (!answers.prisma) {
    await rm(path.join(targetDir, "prisma"), {
      recursive: true,
      force: true,
    }).catch(() => {})
    await rm(path.join(targetDir, "src/lib/database.prisma.ts"), {
      force: true,
    }).catch(() => {})
  }

  if (!answers.repomix) {
    await rm(path.join(targetDir, "repomix.config.json"), {
      force: true,
    }).catch(() => {})
  }

  if (answers.importAlias !== "@/*") {
    const newPrefix = answers.importAlias.replace("/*", "/")
    await replaceInFiles(targetDir, "@/", newPrefix)
    await replaceInFiles(targetDir, '"@/*"', `"${answers.importAlias}"`)
  }

  if (!answers.srcDir) {
    const srcPath = path.join(targetDir, "src")
    const entries = await readdir(srcPath).catch(() => [])
    for (const entry of entries) {
      await cp(path.join(srcPath, entry), path.join(targetDir, entry), {
        recursive: true,
      })
    }
    await rm(srcPath, { recursive: true, force: true })
    await replaceInFiles(targetDir, '"./src/*"', '"./*"')
  }

  // 5. Install missing dynamic dependencies via pnpm add
  p.log.step("Installing dependencies...")
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
