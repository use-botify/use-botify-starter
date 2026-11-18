import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { InputFile } from "grammy";

import {
	IMAGE_EXTENSIONS,
	IMAGES_DIRECTORY,
	type ImageExtension,
	type ImageLoadFailure,
	type ImageName,
	type LoadedImage,
	MAX_IMAGE_BYTES,
	SIGNATURES,
} from "@/configs/image.config";

let registry: ReadonlyMap<ImageName, LoadedImage> = new Map();
const fileIds = new Map<ImageName, string>();

export class ImageLoadError extends Error {
	readonly failed: ImageLoadFailure[];

	constructor(failed: ImageLoadFailure[], total: number) {
		const details = failed
			.map(({ name, reason }) => `${name}: ${reason}`)
			.join("\n  - ");
		super(`Failed to load ${failed.length}/${total} image(s):\n  - ${details}`);
		this.name = "ImageLoadError";
		this.failed = failed;
	}
}

export function setImageRegistry(
	next: ReadonlyMap<ImageName, LoadedImage>,
): void {
	registry = next;
	fileIds.clear();
}

export function getImage(name: ImageName): InputFile {
	const image = registry.get(name);

	if (!image) {
		throw new Error(
			`Image "${name}" is not available (it failed to load, or registerImagesHandlers() was not called)`,
		);
	}

	return new InputFile(image.data, image.filename);
}

export function getImageSource(name: ImageName): string | InputFile {
	return fileIds.get(name) ?? getImage(name);
}

export function cacheImageFileId(name: ImageName, fileId: string): void {
	fileIds.set(name, fileId);
}

export function forgetImageFileId(name: ImageName): void {
	fileIds.delete(name);
}

export function formatBytes(bytes: number): string {
	return bytes < 1024 * 1024
		? `${(bytes / 1024).toFixed(1)} KB`
		: `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function toReason(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function isNotFound(error: unknown): boolean {
	return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function assertValidImage(
	data: Uint8Array,
	filename: string,
	extension: ImageExtension,
): void {
	if (data.length === 0) {
		throw new Error(`"${filename}" is empty`);
	}
	if (data.length > MAX_IMAGE_BYTES) {
		throw new Error(
			`"${filename}" is ${formatBytes(data.length)}, over Telegram's ${formatBytes(MAX_IMAGE_BYTES)} photo limit`,
		);
	}

	const matchesFormat = SIGNATURES[extension].every(
		(byte, index) => data[index] === byte,
	);
	if (!matchesFormat) {
		throw new Error(
			`"${filename}" is not a valid ${extension.slice(1).toUpperCase()} file`,
		);
	}
}

export async function readImage(name: ImageName): Promise<LoadedImage> {
	for (const extension of IMAGE_EXTENSIONS) {
		const filename = `${name}${extension}`;

		let data: Uint8Array;
		try {
			data = await readFile(resolve(IMAGES_DIRECTORY, filename));
		} catch (error) {
			if (isNotFound(error)) continue;
			throw error;
		}

		assertValidImage(data, filename, extension);
		return { data, filename };
	}

	const expected = IMAGE_EXTENSIONS.map((extension) => `${name}${extension}`);
	throw new Error(`no file found (expected ${expected.join(", ")})`);
}
