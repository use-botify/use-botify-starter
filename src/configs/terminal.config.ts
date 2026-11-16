import chalk from "chalk";

export const terminal = {
	command: (name: string) =>
		chalk.bgHex("#164E63").hex("#67E8F9").bold(` COMMAND ${name} `),

	callback: (name: string) =>
		chalk.bgHex("#581C87").hex("#E9D5FF").bold(` CALLBACK ${name} `),

	success: (message: string) =>
		chalk.bgHex("#14532D").hex("#86EFAC").bold(` SUCCESS ${message} `),

	error: (message: string) =>
		chalk.bgHex("#7F1D1D").hex("#FCA5A5").bold(` ERROR ${message} `),

	warning: (message: string) =>
		chalk.bgHex("#78350F").hex("#FDE68A").bold(` WARN ${message} `),

	info: (message: string) =>
		chalk.bgHex("#1E3A8A").hex("#BFDBFE").bold(` INFO ${message} `),
};
