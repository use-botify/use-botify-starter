#!/usr/bin/env node
import * as p from "@clack/prompts"

import { scaffoldProject } from "@/scaffold"

scaffoldProject().catch((error: unknown) => {
  p.log.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
