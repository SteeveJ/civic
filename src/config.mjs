// Every setting lives in one place, with a default, so `npm start` works with no .env at all.
export function loadConfig(env = process.env) {
  const int = (name, def) => {
    const v = env[name] === undefined || env[name] === '' ? def : Number(env[name]);
    if (!Number.isInteger(v) || v <= 0) throw new Error(`${name} doit être un entier positif (reçu : ${env[name]})`);
    return v;
  };
  return {
    apiKey: env.ANTHROPIC_API_KEY || '',
    model: env.MODEL || 'claude-haiku-5-5',
    port: int('PORT', 3000),
    dailyLimit: int('DAILY_LIMIT', 100),
    trustProxy: env.TRUST_PROXY === '1',
    python: env.PYTHON || 'python3',
  };
}
