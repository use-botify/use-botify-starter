import type { Feature } from "@/core";
import { adminFeature } from "@/features/admin/admin.feature";
import { developerFeature } from "@/features/developer/developer.feature";
import { publicFeature } from "@/features/public/public.feature";

export const features: readonly Feature[] = [
	publicFeature,
	adminFeature,
	developerFeature,
];
