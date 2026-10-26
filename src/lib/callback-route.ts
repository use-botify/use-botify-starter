export const MAX_CALLBACK_BYTES = 64;

const SEPARATOR = ":";
const PARAM_SEGMENT = /^\{([A-Za-z_][A-Za-z0-9_]*)\}$/;
const LITERAL_SEGMENT = /^[A-Za-z0-9_.-]+$/;
const REGEX_SPECIALS = /[.*+?^${}()|[\]\\]/g;

export type RouteSegment =
	| { kind: "literal"; value: string }
	| { kind: "param"; name: string };

type SegmentParam<S extends string> = S extends `{${infer Name}}`
	? Name
	: never;

type ParamNames<P extends string> = P extends `${infer Head}:${infer Tail}`
	? SegmentParam<Head> | ParamNames<Tail>
	: SegmentParam<P>;

export type CallbackParams<P extends string> = {
	[K in ParamNames<P>]: string;
};

export type CallbackInput<P extends string> = {
	[K in ParamNames<P>]: string | number;
};

type BuildArgs<P extends string> = [ParamNames<P>] extends [never]
	? []
	: [params: CallbackInput<P>];

export type RouteInfo = {
	readonly pattern: string;
	readonly segments: readonly RouteSegment[];
	readonly regex: RegExp;
	match: (data: string) => Record<string, string> | null;
};

export type CallbackRoute<P extends string = string> = RouteInfo & {
	readonly pattern: P;
	build: (...args: BuildArgs<P>) => string;
};

const escapeRegExp = (value: string): string =>
	value.replace(REGEX_SPECIALS, "\\$&");

const parseSegments = (pattern: string): RouteSegment[] => {
	const segments = pattern.split(SEPARATOR).map((raw): RouteSegment => {
		const name = PARAM_SEGMENT.exec(raw)?.[1];
		if (name) return { kind: "param", name };
		if (LITERAL_SEGMENT.test(raw)) return { kind: "literal", value: raw };

		throw new Error(
			`Invalid callback route "${pattern}": segment "${raw}" must be a literal (letters, digits, "_", "-", ".") or a {param}.`,
		);
	});

	const names = segments.flatMap((segment) =>
		segment.kind === "param" ? [segment.name] : [],
	);
	if (new Set(names).size !== names.length) {
		throw new Error(
			`Invalid callback route "${pattern}": param names must be unique.`,
		);
	}

	return segments;
};

export function defineCallbackRoute<P extends string>(
	pattern: P,
): CallbackRoute<P> {
	const segments = parseSegments(pattern);

	const minimumBytes =
		segments.reduce(
			(sum, segment) =>
				sum +
				(segment.kind === "literal" ? Buffer.byteLength(segment.value) : 1),
			0,
		) +
		(segments.length - 1);
	if (minimumBytes > MAX_CALLBACK_BYTES) {
		throw new Error(
			`Invalid callback route "${pattern}": even with 1-byte params it needs ${minimumBytes} bytes, Telegram allows at most ${MAX_CALLBACK_BYTES}.`,
		);
	}

	const regex = new RegExp(
		`^${segments
			.map((segment) =>
				segment.kind === "literal" ? escapeRegExp(segment.value) : "([^:]+)",
			)
			.join(SEPARATOR)}$`,
	);

	const build = (...args: unknown[]): string => {
		const params = (args[0] ?? {}) as Record<string, string | number>;

		const data = segments
			.map((segment) => {
				if (segment.kind === "literal") return segment.value;

				const value = String(params[segment.name] ?? "");
				if (value === "" || value.includes(SEPARATOR)) {
					throw new Error(
						`Callback route "${pattern}": param "${segment.name}" must be non-empty and must not contain "${SEPARATOR}" (got "${value}").`,
					);
				}
				return value;
			})
			.join(SEPARATOR);

		const bytes = Buffer.byteLength(data);
		if (bytes > MAX_CALLBACK_BYTES) {
			throw new Error(
				`Callback route "${pattern}": built data "${data}" is ${bytes} bytes, Telegram allows at most ${MAX_CALLBACK_BYTES}.`,
			);
		}

		return data;
	};

	const match = (data: string): Record<string, string> | null => {
		const result = regex.exec(data);
		if (!result) return null;

		const params: Record<string, string> = {};
		let group = 1;
		for (const segment of segments) {
			if (segment.kind === "param") {
				params[segment.name] = result[group] ?? "";
				group += 1;
			}
		}
		return params;
	};

	return {
		pattern,
		segments,
		regex,
		match,
		build: build as CallbackRoute<P>["build"],
	};
}
