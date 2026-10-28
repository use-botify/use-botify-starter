import process from "node:process";

import { logger } from "@/lib/logger";

const PHASES = ["ingress", "workers", "resources"] as const;

type ShutdownPhase = (typeof PHASES)[number];

type ShutdownTask = {
	name: string;
	phase: ShutdownPhase;
	run: () => Promise<void> | void;
	timeoutMs?: number;
};

const FORCE_EXIT_MARGIN_MS = 1_000;
const DEFAULT_TASK_TIMEOUT_MS = 4_000;

const tasks: ShutdownTask[] = [];
let isShuttingDown = false;

export const isShutdownInProgress = (): boolean => isShuttingDown;

export const onShutdown = (task: ShutdownTask): void => {
	tasks.push(task);
};

const taskTimeout = (task: ShutdownTask): number =>
	task.timeoutMs ?? DEFAULT_TASK_TIMEOUT_MS;

const forceExitBudgetMs = (): number =>
	PHASES.reduce(
		(total, phase) =>
			total +
			Math.max(
				0,
				...tasks.filter((task) => task.phase === phase).map(taskTimeout),
			),
		FORCE_EXIT_MARGIN_MS,
	);

const runWithTimeout = async (task: ShutdownTask): Promise<void> => {
	const ms = taskTimeout(task);
	let timer: NodeJS.Timeout | undefined;

	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
	});

	try {
		await Promise.race([Promise.resolve().then(task.run), timeout]);
	} finally {
		clearTimeout(timer);
	}
};

export const shutdown = async (reason: string, exitCode = 0): Promise<void> => {
	if (isShuttingDown) return;
	isShuttingDown = true;

	logger.info(
		"Shutdown",
		`Received ${reason}. Running ${tasks.length} cleanup task(s)...`,
	);

	const forceExitMs = forceExitBudgetMs();
	const forceExit = setTimeout(() => {
		logger.error("Shutdown", `Timed out after ${forceExitMs}ms. Forcing exit.`);
		process.exit(1);
	}, forceExitMs).unref();

	let finalCode = exitCode;

	for (const phase of PHASES) {
		const phaseTasks = tasks.filter((task) => task.phase === phase);

		await Promise.all(
			phaseTasks.map(async (task) => {
				try {
					await runWithTimeout(task);
					logger.info("Shutdown", `${task.name} closed.`);
				} catch (err) {
					logger.error("Shutdown", `Failed to close ${task.name}:`, err);
					finalCode = 1;
				}
			}),
		);
	}

	clearTimeout(forceExit);
	logger.info("Shutdown", `Finished with exit code ${finalCode}.`);
	process.exit(finalCode);
};

export const installProcessHooks = (): void => {
	logger.info(
		"Process",
		`Hooks installed (pid ${process.pid}, node ${process.version}, ${process.platform}).`,
	);

	for (const signal of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"] as const) {
		process.once(signal, () => void shutdown(signal));
	}

	process.on("unhandledRejection", (reason) => {
		logger.error("Process", "Unhandled Promise Rejection", reason);
		void shutdown("unhandledRejection", 1);
	});

	process.on("uncaughtException", (err, origin) => {
		logger.error("Process", `Uncaught Exception (origin: ${origin}):`, err);
		void shutdown("uncaughtException", 1);
	});

	process.on("warning", (warning) => {
		logger.warn("Process", `${warning.name}: ${warning.message}`);
	});

	process.on("exit", (code) => {
		logger.info("Process", `Exiting with code ${code}.`);
	});
};
