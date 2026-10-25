import { env } from "@/configs/env.config";
import type { BotContext } from "@/lib/bot";

const ADMIN_IDS: ReadonlySet<number> = new Set([
	...env.ADMIN_IDS,
	env.DEVELOPER_ID,
]);

const ADMIN_BIGINT_IDS: readonly bigint[] = [...ADMIN_IDS].map((id) =>
	BigInt(id),
);

export const isUserAdmin = (userId?: number): boolean =>
	userId !== undefined && ADMIN_IDS.has(userId);

export const isUserDeveloper = (userId?: number): boolean =>
	userId !== undefined && userId === env.DEVELOPER_ID;

export const getAdminBigIntIds = (): readonly bigint[] => ADMIN_BIGINT_IDS;

type WithFrom<C extends BotContext> = C & { from: NonNullable<C["from"]> };

const createGuard =
	(isAllowed: (userId?: number) => boolean) =>
	<C extends BotContext>(ctx: C): ctx is WithFrom<C> =>
		isAllowed(ctx.from?.id);

export const isAdminCtx = createGuard(isUserAdmin);
export const isDeveloperCtx = createGuard(isUserDeveloper);
