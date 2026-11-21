import { createLibraryConfig } from "@workspace/tsdown-config"

export default createLibraryConfig({
  platform: "node",
  entry: {
    cli: "src/cli.ts",
    index: "src/index.ts",
    types: "src/types.ts",
  },
})
