import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createShareCoreModulesPlugin,
  startFeatureHmr,
  toPosixPath,
} from "../src/hmr";
import { BotifyToolingError } from "../src/index";
import type { FeatureHmrController } from "../src/types";

const tempDirs: string[] = [];
const activeControllers: FeatureHmrController[] = [];

async function createTempProject(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "botify-tooling-hmr-"));
  tempDirs.push(dir);
  return dir;
}

async function writeProjectFile(
  rootDir: string,
  relativePath: string,
  content: string,
): Promise<string> {
  const fullPath = path.join(rootDir, relativePath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, content, "utf8");
  return fullPath;
}

afterEach(async () => {
  while (activeControllers.length > 0) {
    const controller = activeControllers.pop();
    if (controller) {
      await controller.close();
    }
  }

  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe("createShareCoreModulesPlugin", () => {
  it("only intercepts core scripts outside features/", async () => {
    const dir = await createTempProject();
    const sourceDir = path.join(dir, "src");
    const featuresDir = path.join(sourceDir, "features");

    const coreFile = await writeProjectFile(
      dir,
      "src/lib/state.mjs",
      "export const sharedValue = 42\nexport default 'core'",
    );
    const featureFile = await writeProjectFile(
      dir,
      "src/features/ping/command.mjs",
      "export const featureValue = 1",
    );

    const plugin = createShareCoreModulesPlugin({
      sourceDir,
      featuresDir,
      scriptPattern: /\.[cm]?[jt]sx?$/,
    });

    const loadHook =
      typeof plugin.load === "function" ? plugin.load : plugin.load?.handler;
    expect(loadHook).toBeTypeOf("function");

    const coreResult = await loadHook?.call({} as never, toPosixPath(coreFile));
    expect(typeof coreResult).toBe("string");
    expect(String(coreResult)).toContain(
      "export const { sharedValue } = shared",
    );
    expect(String(coreResult)).toContain("export default shared.default");

    const featureResult = await loadHook?.call(
      {} as never,
      toPosixPath(featureFile),
    );
    expect(featureResult).toBeNull();
  });
});

describe("startFeatureHmr", () => {
  it("loads fresh feature modules on reload and survives non-initial reload errors", async () => {
    const rootDir = await createTempProject();
    const commandFile = await writeProjectFile(
      rootDir,
      "src/features/start/command.ts",
      "export const version: number = 1\nexport default () => version",
    );

    const loadedVersions: number[] = [];
    let failNextReload = false;
    const onError = vi.fn();

    const controller = await startFeatureHmr({
      projectRoot: rootDir,
      debounceMs: 20,
      logger: false,
      onError,
      onReload: async ({ loadModule }) => {
        if (failNextReload) {
          throw new Error("Simulated reload failure");
        }

        const mod = await loadModule(commandFile);
        loadedVersions.push(Number(mod.version));
      },
    });
    activeControllers.push(controller);

    expect(controller.reloadCount).toBe(1);
    expect(loadedVersions).toEqual([1]);

    // Update the feature file and trigger a reload
    await writeFile(
      commandFile,
      "export const version: number = 2\nexport default () => version",
      "utf8",
    );
    await controller.reload(commandFile);

    expect(controller.reloadCount).toBe(2);
    expect(loadedVersions).toEqual([1, 2]);

    // Simulate a broken edit: previous reloadCount stays active and onError fires
    failNextReload = true;
    await controller.reload(commandFile);

    expect(controller.reloadCount).toBe(2);
    expect(onError).toHaveBeenCalledTimes(1);

    await controller.close();
  });

  it("throws HMR_INIT_FAILED when the initial load fails or debounceMs is invalid", async () => {
    const rootDir = await createTempProject();

    await expect(
      startFeatureHmr({
        projectRoot: rootDir,
        debounceMs: -1,
        logger: false,
        onReload: () => {},
      }),
    ).rejects.toThrow(BotifyToolingError);

    await expect(
      startFeatureHmr({
        projectRoot: rootDir,
        logger: false,
        onReload: () => {
          throw new Error("Initial boot error");
        },
      }),
    ).rejects.toMatchObject({
      name: "BotifyToolingError",
      code: "HMR_INIT_FAILED",
    });
  });
});
