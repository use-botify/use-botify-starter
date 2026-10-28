export const sleepTimer = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));
