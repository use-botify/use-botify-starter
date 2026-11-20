import { getErrorMessage } from "@workspace/utils";
import {
  Bot,
  type Context,
  type Middleware,
  type PollingOptions,
} from "grammy";
import type { UserFromGetMe } from "grammy/types";

import type {
  BotConfigInput,
  BotifyApp,
  BotStatus,
  ShutdownController,
  ShutdownHook,
  StartBotOptions,
  TokenVerificationResult,
} from "../types/core.types";
import { defineBotConfig } from "./define-config";
import { BotifyCoreError } from "./errors";
import { setupGracefulShutdown } from "./shutdown";
import { verifyBotToken } from "./validate-token";

export function createBot<C extends Context = Context>(
  configInput: BotConfigInput<C>,
): BotifyApp<C> {
  const config = defineBotConfig(configInput);
  const bot = new Bot<C>(config.token, config.grammy);
  const dynamicHooks = new Set<ShutdownHook>();

  let status: BotStatus = "idle";
  let botInfo: UserFromGetMe | undefined;
  let pollingPromise: Promise<void> | undefined;
  let shutdownController: ShutdownController | undefined;

  const stopPolling = async (): Promise<void> => {
    if (status === "idle" || status === "stopped") {
      return;
    }

    status = "stopping";

    if (bot.isRunning()) {
      await bot.stop();
    }

    if (pollingPromise) {
      await pollingPromise.catch(() => undefined);
      pollingPromise = undefined;
    }

    status = "stopped";
  };

  const verifyToken = async (): Promise<TokenVerificationResult> => {
    const result = await verifyBotToken(bot.api, config.token);
    botInfo = result.botInfo;

    config.logger.info("Bot", `Verified token (${result.maskedToken})`, {
      id: result.botInfo.id,
      username: result.botInfo.username,
    });

    return result;
  };

  const start = async (
    options: StartBotOptions = {},
  ): Promise<UserFromGetMe> => {
    if (status === "starting" || status === "running") {
      throw new BotifyCoreError(
        "BOT_ALREADY_RUNNING",
        "Bot is already starting or running.",
      );
    }

    status = "starting";

    const shouldVerify = options.verifyToken ?? config.verifyToken;
    if (shouldVerify) {
      try {
        await verifyToken();
      } catch (error: unknown) {
        status = "idle";
        throw error;
      }
    }

    shutdownController = setupGracefulShutdown({
      stop: stopPolling,
      logger: config.logger,
      options: config.shutdown,
      getExtraHooks: () => [...dynamicHooks],
      registerSignals: options.registerSignals ?? true,
    });

    const baseOnStart = options.polling?.onStart ?? config.polling?.onStart;
    const hookOnStart = options.onStart;

    let settled = false;
    let resolveStart!: (info: UserFromGetMe) => void;
    let rejectStart!: (error: unknown) => void;

    const startupPromise = new Promise<UserFromGetMe>((resolve, reject) => {
      resolveStart = resolve;
      rejectStart = reject;
    });

    const mergedPolling: PollingOptions = {
      ...config.polling,
      ...options.polling,
      onStart: async (info) => {
        botInfo = info;
        status = "running";

        config.logger.info("Bot", `Started @${info.username}`, {
          id: info.id,
          username: info.username,
        });

        try {
          await baseOnStart?.(info);
          if (hookOnStart && hookOnStart !== baseOnStart) {
            await hookOnStart(info);
          }
        } catch (error: unknown) {
          shutdownController?.unregister();
          shutdownController = undefined;
          await stopPolling().catch(() => undefined);

          if (!settled) {
            settled = true;
            rejectStart(error);
          }
          return;
        }

        if (!settled) {
          settled = true;
          resolveStart(info);
        }
      },
    };

    pollingPromise = bot.start(mergedPolling).then(
      () => {
        if (status === "running" || status === "starting") {
          status = "stopped";
        }
      },
      (error: unknown) => {
        shutdownController?.unregister();
        shutdownController = undefined;
        status = "stopped";

        if (!settled) {
          settled = true;
          rejectStart(error);
          return;
        }

        config.logger.fatal("Bot", "Bot polling stopped unexpectedly", {
          error: getErrorMessage(error),
        });
      },
    );

    return startupPromise;
  };

  const stop = async (signal: NodeJS.Signals = "SIGTERM"): Promise<void> => {
    if (shutdownController) {
      const controller = shutdownController;
      shutdownController = undefined;
      await controller.shutdown(signal);
      return;
    }

    await stopPolling();
  };

  const onShutdown = (hook: ShutdownHook): (() => void) => {
    dynamicHooks.add(hook);
    return () => {
      dynamicHooks.delete(hook);
    };
  };

  const app: BotifyApp<C> = {
    bot,
    config,
    logger: config.logger,
    get status(): BotStatus {
      return status;
    },
    get botInfo(): UserFromGetMe | undefined {
      return botInfo;
    },
    use(...middleware: Middleware<C>[]): BotifyApp<C> {
      bot.use(...middleware);
      return app;
    },
    onShutdown,
    verifyToken,
    start,
    stop,
  };

  return Object.freeze(app);
}
