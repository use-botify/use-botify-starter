import { createLibraryConfig } from "@workspace/tsdown-config"

export default createLibraryConfig({
  platform: "node",
  entry: {
    index: "src/index.ts",
    hmr: "src/hmr.ts",
    codegen: "src/codegen.ts",
    types: "src/types.ts",
  },
})
