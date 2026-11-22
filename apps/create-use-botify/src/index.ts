export { formatCliHelp, parseCliArgs } from "./lib/args"
export { CreateBotifyError } from "./lib/errors"
export {
  detectPackageManager,
  formatRunScript,
  getInstallCommand,
  isPackageManager,
  PACKAGE_MANAGERS,
} from "./lib/package-manager"
export { promptScaffoldOptions } from "./lib/prompts"
export { scaffoldProject } from "./lib/scaffold"
export {
  DEFAULT_IMPORT_ALIAS,
  DEFAULT_PROJECT_NAME,
  featureSelectionSchema,
  getAliasPrefix,
  importAliasSchema,
  packageManagerSchema,
  projectNameSchema,
  resolveScaffoldOptions,
  scaffoldOptionsSchema,
  toValidPackageName,
  validateImportAlias,
  validateProjectName,
} from "./lib/schema"
export { BOTIFY_VERSIONS } from "./templates/config-files"
export { renderProjectFiles } from "./templates/render-project"
