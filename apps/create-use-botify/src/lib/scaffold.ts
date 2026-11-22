import { spawn } from "node:child_process"
import { mkdir, readdir, writeFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"

import { getErrorMessage, hasErrorCode } from "@workspace/utils"

import { renderProjectFiles } from "../templates/render-project"
import type {
  ScaffoldCallbacks,
  ScaffoldOptions,
  ScaffoldResult,
} from "../types/cli.types"
import { CreateBotifyError } from "./errors"
import { getInstallCommand } from "./package-manager"

async function ensureTargetDirectory(
  targetDir: string,
  overwrite: boolean
): Promise<void> {
  try {
    const entries = await readdir(targetDir)
    const hasBlockingFiles = entries.some((entry) => entry !== ".git")

    if (hasBlockingFiles && !overwrite) {
      throw new CreateBotifyError(
        "TARGET_NOT_EMPTY",
        `Target directory "${targetDir}" is not empty. Pass --overwrite to continue anyway.`
      )
    }
  } catch (error: unknown) {
    if (error instanceof CreateBotifyError) {
      throw error
    }

    if (!hasErrorCode(error, "ENOENT")) {
      throw new CreateBotifyError(
        "SCAFFOLD_FAILED",
        `Unable to inspect target directory "${targetDir}": ${getErrorMessage(error)}`,
        { cause: error }
      )
    }
  }

  try {
    await mkdir(targetDir, { recursive: true })
  } catch (error: unknown) {
    throw new CreateBotifyError(
      "SCAFFOLD_FAILED",
      `Failed to create directory "${targetDir}": ${getErrorMessage(error)}`,
      { cause: error }
    )
  }
}

function runSubprocess(
  command: string,
  args: readonly string[],
  cwd: string,
  useShellOnWindows: boolean
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child =
      process.platform === "win32" && useShellOnWindows
        ? spawn([command, ...args].join(" "), {
            cwd,
            shell: true,
            stdio: "pipe",
          })
        : spawn(command, [...args], {
            cwd,
            shell: false,
            stdio: "pipe",
          })

    let stderr = ""
    child.stderr?.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString()
    })

    child.on("error", (error) => {
      reject(error)
    })

    child.on("close", (code) => {
      if (code === 0) {
        resolve()
        return
      }

      const detail = stderr.trim()
      reject(
        new Error(
          detail.length > 0
            ? detail
            : `Command "${command} ${args.join(" ")}" exited with code ${String(code)}.`
        )
      )
    })
  })
}

async function initGitRepository(targetDir: string): Promise<boolean> {
  try {
    await runSubprocess("git", ["init"], targetDir, false)
    return true
  } catch {
    return false
  }
}

/**
 * Renders and writes the scaffolded project to `options.targetDir`, then
 * optionally initializes git and installs dependencies.
 */
export async function scaffoldProject(
  options: ScaffoldOptions,
  callbacks: ScaffoldCallbacks = {}
): Promise<ScaffoldResult> {
  await ensureTargetDirectory(options.targetDir, options.overwrite)

  const files = renderProjectFiles(options)
  callbacks.onFilesStart?.(files.length)

  try {
    for (const file of files) {
      const destination = path.resolve(options.targetDir, file.path)
      await mkdir(path.dirname(destination), { recursive: true })
      await writeFile(destination, file.content, "utf8")
    }
  } catch (error: unknown) {
    throw new CreateBotifyError(
      "SCAFFOLD_FAILED",
      `Failed while writing scaffold files: ${getErrorMessage(error)}`,
      { cause: error }
    )
  }

  callbacks.onFilesComplete?.(files.length)

  let gitInitialized = false
  if (options.git) {
    callbacks.onGitStart?.()
    gitInitialized = await initGitRepository(options.targetDir)
    callbacks.onGitComplete?.(gitInitialized)

    if (!gitInitialized) {
      callbacks.onWarning?.(
        "Skipped git initialization (git was not found or failed)."
      )
    }
  }

  let installed = false
  if (options.install) {
    callbacks.onInstallStart?.(options.packageManager)
    const { command, args } = getInstallCommand(options.packageManager)

    try {
      await runSubprocess(command, args, options.targetDir, true)
      installed = true
      callbacks.onInstallComplete?.(true)
    } catch (error: unknown) {
      callbacks.onInstallComplete?.(false)
      callbacks.onWarning?.(
        `Dependency installation failed (${getErrorMessage(error)}). Run "${command} ${args.join(" ")}" manually.`
      )
    }
  }

  return Object.freeze<ScaffoldResult>({
    options,
    files,
    installed,
    gitInitialized,
  })
}
