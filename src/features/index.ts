import type { Feature } from "@/core";
import { developerFeature } from "@/features/developer/developer.feature";
import { publicFeature } from "@/features/public/public.feature";

export const features: readonly Feature[] = [publicFeature, developerFeature];
