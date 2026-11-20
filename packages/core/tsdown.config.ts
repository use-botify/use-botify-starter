import { createLibraryConfig } from "@workspace/tsdown-config"

export default createLibraryConfig({
  platform: "node",
  entry: {
    index: "src/index.ts",
    middleware: "src/middleware.ts",
    types: "src/types.ts",
  },
})
