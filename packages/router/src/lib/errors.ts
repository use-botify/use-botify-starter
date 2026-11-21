import type { FeatureValidationProblem } from "../types/feature.types"
import type { RouterErrorCode } from "../types/route.types"

export class BotifyRouterError extends Error {
  readonly code: RouterErrorCode

  constructor(code: RouterErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = "BotifyRouterError"
    this.code = code
  }
}

export class FeatureValidationError extends BotifyRouterError {
  readonly problems: readonly FeatureValidationProblem[]

  constructor(problems: readonly FeatureValidationProblem[]) {
    const details = problems.map((problem) => `- ${problem.message}`).join("\n")
    super(
      "INVALID_FEATURE_CONFIG",
      `Invalid feature configuration (${problems.length} problem(s)):\n${details}`
    )
    this.name = "FeatureValidationError"
    this.problems = Object.freeze([...problems])
  }
}
