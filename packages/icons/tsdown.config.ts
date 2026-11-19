import { createLibraryConfig } from "@workspace/tsdown-config"

export default createLibraryConfig({
  entry: {
    index: "src/index.ts",
    utils: "src/utils.ts",
    types: "src/types.ts",
  },
  deps: {
    onlyImport: [],
  },
})
