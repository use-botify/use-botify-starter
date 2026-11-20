import type {
  Bot,
  Context,
  BotConfig as GrammyBotConfig,
  Middleware,
  PollingOptions,
} from "grammy";
import type { UserFromGetMe } from "grammy/types";

export type CoreErrorCode =
  | "INVALID_BOT_TOKEN"
  | "TOKEN_VERIFICATION_FAILED"
  | "INVALID_CONFIG"
  | "BOT_ALREADY_RUNNING"
  | "SHUTDOWN_TIMEOUT";

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export type LogMeta = Readonly<Record<string, unknown>>;

export interface CoreLogger {
  debug(scope: string, message: string, meta?: LogMeta): void;
  info(scope: string, message: string, meta?: LogMeta): void;
  warn(scope: string, message: string, meta?: LogMeta): void;
  error(scope: string, message: string, meta?: LogMeta): void;
  fatal(scope: string, message: string, meta?: LogMeta): void;
}

export type ShutdownHook = (signal: NodeJS.Signals) => void | Promise<void>;

export interface ShutdownOptions {
  readonly signals?: readonly NodeJS.Signals[];
  readonly timeoutMs?: number;
  readonly exitProcess?: boolean;
  readonly onShutdown?: ShutdownHook | readonly ShutdownHook[];
}

export interface ResolvedShutdownOptions {
  readonly signals: readonly NodeJS.Signals[];
  readonly timeoutMs: number;
  readonly exitProcess: boolean;
  readonly onShutdown: readonly ShutdownHook[];
}

export interface BotConfigInput<C extends Context = Context> {
  /** Telegram Bot API token from @BotFather. */
  readonly token: string;
  /** Optional low-level grammY `new Bot(token, config)` options. */
  readonly grammy?: GrammyBotConfig<C>;
  /** Custom logger implementation, or `false` to disable logging. */
  readonly logger?: CoreLogger | false;
  /** Verify token against Telegram (`getMe`) before starting polling. Defaults to `true`. */
  readonly verifyToken?: boolean;
  /** grammY polling options passed to `bot.start(...)`. */
  readonly polling?: PollingOptions;
  /** Graceful shutdown settings (`SIGINT` / `SIGTERM`, timeout, cleanup hooks). */
  readonly shutdown?: ShutdownOptions;
}

export interface ResolvedBotConfig<C extends Context = Context> {
  readonly token: string;
  readonly grammy: GrammyBotConfig<C> | undefined;
  readonly logger: CoreLogger;
  readonly verifyToken: boolean;
  readonly polling: PollingOptions | undefined;
  readonly shutdown: ResolvedShutdownOptions;
}

export interface TokenVerificationResult {
  readonly botInfo: UserFromGetMe;
  readonly maskedToken: string;
}

export type BotStatus =
  | "idle"
  | "starting"
  | "running"
  | "stopping"
  | "stopped";

export interface StartBotOptions {
  /** Override polling options for this start call. */
  readonly polling?: PollingOptions;
  /** Override `config.verifyToken` for this start call. */
  readonly verifyToken?: boolean;
  /** Hook invoked right after polling starts with the bot's Telegram profile. */
  readonly onStart?: (botInfo: UserFromGetMe) => void | Promise<void>;
  /** Attach OS signal listeners (`SIGINT`/`SIGTERM`). Defaults to `true`. */
  readonly registerSignals?: boolean;
}

export interface SetupGracefulShutdownParams {
  readonly stop: () => void | Promise<void>;
  readonly logger: CoreLogger;
  readonly options: ResolvedShutdownOptions;
  readonly getExtraHooks?: () => readonly ShutdownHook[];
  readonly registerSignals?: boolean;
}

export interface ShutdownController {
  readonly isShuttingDown: boolean;
  shutdown(signal?: NodeJS.Signals): Promise<void>;
  unregister(): void;
}

export interface BotifyApp<C extends Context = Context> {
  readonly bot: Bot<C>;
  readonly config: ResolvedBotConfig<C>;
  readonly logger: CoreLogger;
  readonly status: BotStatus;
  readonly botInfo: UserFromGetMe | undefined;
  use(...middleware: Middleware<C>[]): BotifyApp<C>;
  onShutdown(hook: ShutdownHook): () => void;
  verifyToken(): Promise<TokenVerificationResult>;
  start(options?: StartBotOptions): Promise<UserFromGetMe>;
  stop(signal?: NodeJS.Signals): Promise<void>;
}
