import type { BotCommand } from "grammy/types";

import { ACCESS_RANK, type Access } from "@/configs/access.config";
import { type Feature, resolveAccess } from "@/configs/feature.config";

type Candidate = { description: string; rank: number; visible: boolean };

export function buildCommandMenu(
	features: readonly Feature[],
	targetAccess: Access,
): BotCommand[] {
	const winners = new Map<string, Candidate>();

	for (const feature of features) {
		for (const command of feature.commands ?? []) {
			const rank = ACCESS_RANK[resolveAccess(feature, command)];
			if (rank > ACCESS_RANK[targetAccess]) continue;

			const existing = winners.get(command.name);
			if (existing && existing.rank > rank) continue;

			winners.set(command.name, {
				description: command.description,
				rank,
				visible: command.showInMenu ?? true,
			});
		}
	}

	return Array.from(winners.entries())
		.filter(([, { visible }]) => visible)
		.map(([command, { description }]) => ({ command, description }));
}
