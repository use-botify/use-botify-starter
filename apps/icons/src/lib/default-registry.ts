import { createIconRegistry } from "@/lib/create-icon-registry"

// Helpers over the default icons only. Bots with their own icons call
// `createIconRegistry(extra)` instead.
export const defaultRegistry = createIconRegistry()
