import { adminFeature } from "@/features/admin/admin.feature"
import { developerFeature } from "@/features/developer/developer.feature"
import { publicFeature } from "@/features/public/public.feature"
import type { Feature } from "@/core"

export const features: readonly Feature[] = [
  publicFeature,
  adminFeature,
  developerFeature,
]
