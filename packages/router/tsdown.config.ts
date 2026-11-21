import { createLibraryConfig } from "@workspace/tsdown-config"

export default createLibraryConfig({
  platform: "node",
  entry: {
    index: "src/index.ts",
    fs: "src/fs.ts",
    types: "src/types.ts",
  },
})
