const startTime = Date.now();

export function getUptime(): string {
  const now = Date.now();
  const uptimeMs = now - startTime;

  const seconds = Math.floor((uptimeMs / 1000) % 60);
  const minutes = Math.floor((uptimeMs / (1000 * 60)) % 60);
  const hours = Math.floor((uptimeMs / (1000 * 60 * 60)) % 24);
  const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

export function getBotStats() {
  return {
    uptime: getUptime(),
    memoryUsage: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(3)} MB`,
  };
}
