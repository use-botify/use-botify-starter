import { InputFile } from "grammy";
import { resolve } from "node:path";

const imageFiles = {
  welcome: "welcome.jpg",
} as const;

export type ImageName = keyof typeof imageFiles;

export function getImage(name: ImageName): InputFile {
  const path = resolve(process.cwd(), "assets", "images", imageFiles[name]);

  return new InputFile(path);
}
