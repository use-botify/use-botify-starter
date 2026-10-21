import chalk from "chalk";

export type LogLevel = "INFO" | "WARN" | "ERROR";

export class Logger {
  private serializeContext(context?: unknown): string {
    if (!context) return "";

    if (context instanceof Error) {
      return ` | Context: ${JSON.stringify({
        name: context.name,
        message: context.message,
        stack: context.stack,
      })}`;
    }

    if (typeof context === "object") {
      return ` | Context: ${JSON.stringify(context)}`;
    }

    return ` | Context: ${String(context)}`;
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
}

export const logger = new Logger();
