import chalk from "chalk";
import pino, { type DestinationStream } from "pino";

import { getIndianDateTime } from "@/utils/get-current-details";

export const LOG_LEVELS = [
	"silent",
	"debug",
	"info",
	"warn",
	"error",
	"fatal",
] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

type LogLevelLabel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

type LogPayload = {
	level: number;
	time: number;
	context?: string;
	msg: string;
	meta?: unknown;
};

type SerializedError = {
	name: string;
	message: string;
	stack?: string;
};

type WriteLine = (line: string) => void;

export type Logger = {
	debug(context: string, message: string, meta?: unknown): void;
	info(context: string, message: string, meta?: unknown): void;
	warn(context: string, message: string, meta?: unknown): void;
	error(context: string, message: string, meta?: unknown): void;
	fatal(context: string, message: string, meta?: unknown): void;
};

const LEVEL_MAP: Record<number, LogLevelLabel> = {
	20: "DEBUG",
	30: "INFO",
	40: "WARN",
	50: "ERROR",
	60: "FATAL",
};

const STACK_MIN_LEVEL = 50;

export function parseLogLevel(
	value: string | undefined,
	fallback: LogLevel,
): LogLevel {
	return LOG_LEVELS.find((level) => level === value) ?? fallback;
}

function isSerializedError(value: unknown): value is SerializedError {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return false;
	}
	return (
		"name" in value &&
		"message" in value &&
		typeof value.message === "string" &&
		Object.keys(value).every((key) =>
			["name", "message", "stack"].includes(key),
		)
	);
}

function formatLevel(level: LogLevelLabel): string {
	const padded = level.padEnd(6, " ");

	switch (level) {
		case "DEBUG":
			return chalk.gray(padded);
		case "INFO":
			return chalk.cyan(padded);
		case "WARN":
			return chalk.yellow(padded);
		case "ERROR":
			return chalk.red(padded);
		case "FATAL":
			return chalk.bgRed.white(padded);
	}
}

function formatError(
	error: Error | SerializedError,
	withStack: boolean,
): string {
	if (withStack && error.stack) return `${error.message}\n${error.stack}`;
	return error.message;
}

function formatValue(value: unknown, withStack: boolean): string {
	if (typeof value === "string") return value;
	if (typeof value === "bigint") return `${value}n`;
	if (value instanceof Error || isSerializedError(value)) {
		return formatError(value, withStack);
	}

	if (typeof value === "object" && value !== null) {
		try {
			return JSON.stringify(value) ?? String(value);
		} catch {
			return "[Unserializable object]";
		}
	}

	return String(value);
}

function formatMeta(meta: unknown, withStack: boolean): string {
	if (meta === undefined || meta === null) return "";

	if (meta instanceof Error || isSerializedError(meta)) {
		return chalk.gray(` | error:${formatError(meta, withStack)}`);
	}

	if (typeof meta === "object" && !Array.isArray(meta)) {
		const entries = Object.entries(meta).filter(
			([, value]) => value !== undefined && value !== null,
		);

		if (entries.length === 0) return "";

		const formatted = entries
			.map(([key, value]) => `${key}:${formatValue(value, withStack)}`)
			.join(" ");

		return chalk.gray(` | ${formatted}`);
	}

	return chalk.gray(` | ${formatValue(meta, withStack)}`);
}

function formatLine(chunk: string): string {
	try {
		const payload = JSON.parse(chunk) as LogPayload;

		const timestamp = chalk.gray(getIndianDateTime(payload.time));
		const levelLabel = LEVEL_MAP[payload.level] ?? "INFO";
		const level = formatLevel(levelLabel);
		const context = chalk.magenta(
			`[${payload.context ?? "App"}]`.padEnd(15, " "),
		);
		const meta = formatMeta(payload.meta, payload.level >= STACK_MIN_LEVEL);

		return `${timestamp}  ${level} ${context} ${payload.msg}${meta}\n`;
	} catch {
		return chunk.endsWith("\n") ? chunk : `${chunk}\n`;
	}
}

export function createPrettyDestination(output: WriteLine): DestinationStream {
	return {
		write(chunk: string): void {
			output(formatLine(chunk));
		},
	};
}

function normalizeMeta(
	value: unknown,
	ancestors: WeakSet<object> = new WeakSet<object>(),
): unknown {
	if (value instanceof Error) {
		return {
			name: value.name,
			message: value.message,
			...(value.stack ? { stack: value.stack } : {}),
		};
	}

	if (typeof value === "bigint") return `${value}n`;
	if (value === null || typeof value !== "object") return value;

	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? "Invalid Date" : value.toISOString();
	}

	if (ancestors.has(value)) return "[Circular]";
	ancestors.add(value);

	let normalized: unknown;
	if (Array.isArray(value)) {
		normalized = value.map((item) => normalizeMeta(item, ancestors));
	} else {
		const output: Record<string, unknown> = {};
		for (const [key, nestedValue] of Object.entries(value)) {
			output[key] = normalizeMeta(nestedValue, ancestors);
		}
		normalized = output;
	}

	ancestors.delete(value);
	return normalized;
}

export function createLogger(level: LogLevel, output: WriteLine): Logger {
	const instance = pino({ level }, createPrettyDestination(output));

	const write = (
		method: Exclude<LogLevel, "silent">,
		context: string,
		message: string,
		meta?: unknown,
	): void => {
		if (!instance.isLevelEnabled(method)) return;
		instance[method](
			{ context, meta: meta !== undefined ? normalizeMeta(meta) : undefined },
			message,
		);
	};

	return {
		debug: (context, message, meta) => write("debug", context, message, meta),
		info: (context, message, meta) => write("info", context, message, meta),
		warn: (context, message, meta) => write("warn", context, message, meta),
		error: (context, message, meta) => write("error", context, message, meta),
		fatal: (context, message, meta) => write("fatal", context, message, meta),
	};
}
