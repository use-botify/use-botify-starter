import type { GeneratedFile, ScaffoldOptions } from "../types/cli.types"
import { renderConfigFiles } from "./config-files"
import { renderCoreFiles } from "./core-files"
import { renderFeatureFiles } from "./feature-files"

/**
 * Renders the complete, deterministically sorted set of project files for
 * the given `ScaffoldOptions` without touching disk.
 */
export function renderProjectFiles(
  options: ScaffoldOptions
): readonly GeneratedFile[] {
  const files: GeneratedFile[] = [
    ...renderConfigFiles(options),
    ...renderCoreFiles(options),
    ...renderFeatureFiles(options),
  ]

  files.sort((a, b) => a.path.localeCompare(b.path))

  return Object.freeze(files.map((file) => Object.freeze({ ...file })))
}
