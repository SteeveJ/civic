// shortcut: in-memory per-IP counter, resets on restart and isn't shared across instances; move to Redis if you scale out.
export function makeQuota(limit, now = () => new Date()) {
  const used = new Map();
  const day = () => now().toISOString().slice(0, 10);
  return {
    take(ip) {
      const key = `${day()}|${ip}`;
      const n = used.get(key) || 0;
      if (n >= limit) return false;
      if (used.size > 50000) used.clear();
      used.set(key, n + 1);
      return true;
    },
    status(ip) {
      const u = used.get(`${day()}|${ip}`) || 0;
      return { used_today: u, daily_limit: limit, remaining: Math.max(0, limit - u) };
    },
  };
}
