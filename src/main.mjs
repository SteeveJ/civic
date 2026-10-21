// Composition root: the only file that knows which adapter plugs into which port.
import { readFile } from 'node:fs/promises';
import { loadConfig } from './config.mjs';
import { makeQuota } from './domain/quota.mjs';
import { makeProcessText } from './application/process-text.mjs';
import { makeAnthropicLlm } from './adapters/llm/anthropic-api.mjs';
import { makeClaudeCliLlm } from './adapters/llm/claude-cli.mjs';
import { makeWatermarkScrubber } from './adapters/scrubber/watermarks.mjs';
import { makeHttpServer } from './adapters/http/server.mjs';

try { process.loadEnvFile(new URL('../.env', import.meta.url)); } catch (e) { if (e.code !== 'ENOENT') throw e; }

let config;
try { config = loadConfig(); } catch (e) { console.error(`Configuration invalide : ${e.message}`); process.exit(1); }

const quota = makeQuota(config.dailyLimit);
const llm = config.apiKey ? makeAnthropicLlm(config) : makeClaudeCliLlm(config);
const processText = makeProcessText({ llm, scrubber: makeWatermarkScrubber(config), quota });
const page = await readFile(new URL('../public/index.html', import.meta.url));

makeHttpServer({ processText, quota, page, trustProxy: config.trustProxy }).listen(config.port, () =>
  console.log(`http://localhost:${config.port} (modèle ${config.model}, ${config.apiKey ? 'clé API' : 'compte Claude local'})`));
