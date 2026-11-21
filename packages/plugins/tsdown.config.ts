import { createLibraryConfig } from "@workspace/tsdown-config"

export default createLibraryConfig({
  platform: "node",
  entry: {
    index: "src/index.ts",
    images: "src/images.ts",
    panels: "src/panels.ts",
    "icon-tools": "src/icon-tools.ts",
    types: "src/types.ts",
  },
})
