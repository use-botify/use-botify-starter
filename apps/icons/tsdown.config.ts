import { createLibraryConfig } from "@workspace/tsdown-config"

export default createLibraryConfig({
  deps: {
    onlyBundle: [/^@workspace\/utils/],
  },
})
