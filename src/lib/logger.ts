import chalk from "chalk";

import { getIndianDateTime } from "@/utils/get-current-details";

export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

type Style = (text: string) => string;

const PLAIN_VALUE = /^[^\s"=]+$/;

const LEVEL_WIDTH = 5;
const STEP_WIDTH = 16;
const GAP = "  ";

const styleTimestamp: Style = chalk.gray;
const styleStep: Style = chalk.magenta;
const styleContext: Style = chalk.greenBright;
const styleStack: Style = chalk.gray;

const LEVEL_STYLES: Record<LogLevel, { level: Style; message: Style }> = {
	INFO: { level: chalk.blueBright, message: chalk.white },
	WARN: { level: chalk.yellowBright, message: chalk.yellow },
	ERROR: { level: chalk.redBright, message: chalk.red },
	DEBUG: { level: chalk.cyan, message: chalk.white },
};

const LEVEL_PRIORITY: Record<LogLevel, number> = {
	DEBUG: 0,
	INFO: 1,
	WARN: 2,
	ERROR: 3,
};

const isLogLevel = (value: string): value is LogLevel =>
	Object.hasOwn(LEVEL_PRIORITY, value);

// Read lazily on purpose: env.config imports this module before dotenv has
// loaded `.env`, and importing env.config from here would create a cycle.
const minimumPriority = (): number => {
	const configured = process.env.LOG_LEVEL?.toUpperCase();
	if (configured && isLogLevel(configured)) return LEVEL_PRIORITY[configured];

	return process.env.NODE_ENV === "production"
		? LEVEL_PRIORITY.INFO
		: LEVEL_PRIORITY.DEBUG;
};

type FormattedContext = { inline: string; details: string[] };

const jsonReplacer = (_key: string, value: unknown): unknown => {
	if (typeof value === "bigint") return value.toString();
	if (value instanceof Error) {
		return { name: value.name, message: value.message };
	}
	return value;
};

const toJson = (value: unknown): string => {
	try {
		return JSON.stringify(value, jsonReplacer);
	} catch {
		return "[Unserializable]";
	}
};

const formatValue = (value: unknown): string => {
	if (typeof value === "string") {
		return PLAIN_VALUE.test(value) ? value : JSON.stringify(value);
	}
	if (value instanceof Error) {
		return JSON.stringify(`${value.name}: ${value.message}`);
	}
	if (typeof value === "object" && value !== null) return toJson(value);
	return String(value);
};

const stackLines = (error: Error): string[] =>
	(error.stack ?? "").split("\n").slice(1);

const formatContext = (context: unknown): FormattedContext => {
	if (context === undefined || context === null) {
		return { inline: "", details: [] };
	}

	if (context instanceof Error) {
		return {
			inline: `${context.name}: ${context.message}`,
			details: stackLines(context),
		};
	}

	if (typeof context === "object" && !Array.isArray(context)) {
		const pairs: string[] = [];
		const details: string[] = [];

		for (const [key, value] of Object.entries(context)) {
			if (value === undefined) continue;
			pairs.push(`${key}:${formatValue(value)}`);
			if (value instanceof Error) details.push(...stackLines(value));
		}

		return { inline: pairs.join(" "), details };
	}

	return {
		inline: typeof context === "object" ? toJson(context) : String(context),
		details: [],
	};
};

const formatLine = (
	level: LogLevel,
	step: string,
	message: string,
	context?: unknown,
): string => {
	const { level: styleLevel, message: styleMessage } = LEVEL_STYLES[level];
	const { inline, details } = formatContext(context);

	const line = [
		styleTimestamp(getIndianDateTime()),
		GAP,
		styleLevel(level.padEnd(LEVEL_WIDTH)),
		GAP,
		styleStep(`[${step}]`.padEnd(STEP_WIDTH)),
		styleMessage(message),
		inline ? ` ${styleContext(`| ${inline}`)}` : "",
	].join("");

	return [line, ...details.map((detail) => styleStack(detail))].join("\n");
};

const write = (level: LogLevel, output: string): void => {
	const stream =
		level === "WARN" || level === "ERROR" ? process.stderr : process.stdout;
	stream.write(`${output}\n`);
};

class Logger {
	private log(
		level: LogLevel,
		step: string,
		message: string,
		context?: unknown,
	): void {
		if (LEVEL_PRIORITY[level] < minimumPriority()) return;

		write(level, formatLine(level, step, message, context));
	}

	public info(
		step: string,
		message: string,
		context?: Record<string, unknown>,
	): void {
		this.log("INFO", step, message, context);
	}

	public warn(
		step: string,
		message: string,
		context?: Record<string, unknown>,
	): void {
		this.log("WARN", step, message, context);
	}

	public error(step: string, message: string, errorOrContext?: unknown): void {
		this.log("ERROR", step, message, errorOrContext);
	}

	public debug(
		step: string,
		message: string,
		context?: Record<string, unknown>,
	): void {
		this.log("DEBUG", step, message, context);
	}
}

export const logger = new Logger();
