export type Access = "public" | "admin" | "developer";

export const ACCESS_RANK: Record<Access, number> = {
	public: 0,
	admin: 1,
	developer: 2,
};
