import { resolve } from "node:path";

export const LOG_SCOPE = "Images";

export const IMAGES_DIRECTORY = resolve(process.cwd(), "assets", "images");

/**
 * Every image the bot ships with. Add a name here, then drop `<name>.jpg|.jpeg|.png` in assets/images.
 *
 * @example
 * // Add a new image named "goodbye"
 * export const IMAGE_NAMES = ["welcome", "goodbye"] as const;
 */
export const IMAGE_NAMES = ["welcome"] as const;
export type ImageName = (typeof IMAGE_NAMES)[number];

export const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"] as const;
export type ImageExtension = (typeof IMAGE_EXTENSIONS)[number];

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export const SIGNATURES: Record<ImageExtension, readonly number[]> = {
  ".jpg": [0xff, 0xd8, 0xff],
  ".jpeg": [0xff, 0xd8, 0xff],
  ".png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
};

export interface LoadedImage {
  data: Uint8Array;
  filename: string;
}

export interface ImageLoadFailure {
  name: ImageName;
  reason: string;
}

export interface LoadImagesResult {
  total: number;
  loaded: ImageName[];
  failed: ImageLoadFailure[];
  bytes: number;
}
