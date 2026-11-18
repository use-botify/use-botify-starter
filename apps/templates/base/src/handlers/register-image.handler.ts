import {
	IMAGE_NAMES,
	type ImageLoadFailure,
	type ImageName,
	LOG_SCOPE,
	type LoadedImage,
	type LoadImagesResult,
} from "@/configs/image.config";
import {
	formatBytes,
	ImageLoadError,
	readImage,
	setImageRegistry,
	toReason,
} from "@/core/image.core";
import { logger } from "@/lib/logger";

type LoadOutcome =
	| { ok: true; name: ImageName; image: LoadedImage }
	| { ok: false; name: ImageName; reason: string };

export async function registerImageHandler(
	options: { strict?: boolean } = {},
): Promise<LoadImagesResult> {
	const { strict = true } = options;

	logger.info(LOG_SCOPE, "Loading images from disk...");

	const outcomes = await Promise.all(
		IMAGE_NAMES.map(async (name): Promise<LoadOutcome> => {
			try {
				return { ok: true, name, image: await readImage(name) };
			} catch (error) {
				return { ok: false, name, reason: toReason(error) };
			}
		}),
	);

	const loaded = new Map<ImageName, LoadedImage>();
	const failed: ImageLoadFailure[] = [];
	let bytes = 0;

	for (const outcome of outcomes) {
		if (outcome.ok) {
			loaded.set(outcome.name, outcome.image);
			bytes += outcome.image.data.length;
		} else {
			failed.push({ name: outcome.name, reason: outcome.reason });
		}
	}

	if (strict && failed.length > 0) {
		throw new ImageLoadError(failed, IMAGE_NAMES.length);
	}

	setImageRegistry(loaded);

	const result: LoadImagesResult = {
		total: IMAGE_NAMES.length,
		loaded: [...loaded.keys()],
		failed,
		bytes,
	};

	logger.info(
		LOG_SCOPE,
		`Loaded ${result.loaded.length}/${result.total} image(s) (${formatBytes(bytes)})`,
	);

	for (const { name, reason } of failed) {
		logger.error(LOG_SCOPE, `"${name}" failed to load: ${reason}`);
	}
	if (failed.length > 0) {
		logger.warn(
			LOG_SCOPE,
			`Continuing without: ${failed.map(({ name }) => name).join(", ")}`,
		);
	}

	return result;
}
