import chalk from "chalk";

export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

class Logger {
	private jsonReplacer(_key: string, value: unknown): unknown {
		if (typeof value === "bigint") {
			return value.toString();
		}
		if (value instanceof Error) {
			return {
				name: value.name,
				message: value.message,
				stack: value.stack,
			};
		}
		return value;
	}

	private serializeContext(context?: unknown): string {
		if (context === undefined || context === null) return "";

		try {
			if (context instanceof Error) {
				return ` | Context: ${JSON.stringify(
					{
						name: context.name,
						message: context.message,
						stack: context.stack,
					},
					this.jsonReplacer,
				)}`;
			}

			if (typeof context === "object") {
				return ` | Context: ${JSON.stringify(context, this.jsonReplacer)}`;
			}

			return ` | Context: ${String(context)}`;
		} catch {
			return " | Context: [Unserializable Object]";
		}
	}

	private formatMessage(
		level: LogLevel,
		step: string,
		message: string,
		context?: unknown,
	): string {
		const timestamp = new Date().toISOString();
		const contextStr = this.serializeContext(context);

		let coloredLevel: string;
		switch (level) {
			case "INFO":
				coloredLevel = chalk.blue(`[${level}]`);
				break;
			case "WARN":
				coloredLevel = chalk.yellow(`[${level}]`);
				break;
			case "ERROR":
				coloredLevel = chalk.red(`[${level}]`);
				break;
			case "DEBUG":
				coloredLevel = chalk.magenta(`[${level}]`);
				break;
			default:
				coloredLevel = `[${level}]`;
		}

		return `${chalk.gray(`[${timestamp}]`)} ${coloredLevel} ${chalk.green(`[${step}]`)} ${message}${chalk.cyan(contextStr)}`;
	}

	public info(
		step: string,
		message: string,
		context?: Record<string, unknown>,
	): void {
		console.log(this.formatMessage("INFO", step, message, context));
	}

	public warn(
		step: string,
		message: string,
		context?: Record<string, unknown>,
	): void {
		console.warn(this.formatMessage("WARN", step, message, context));
	}

	public error(step: string, message: string, errorOrContext?: unknown): void {
		console.error(this.formatMessage("ERROR", step, message, errorOrContext));
	}

	public debug(
		step: string,
		message: string,
		context?: Record<string, unknown>,
	): void {
		if (process.env.DEBUG) {
			console.debug(this.formatMessage("DEBUG", step, message, context));
		}
	}
}

export const logger = new Logger();
