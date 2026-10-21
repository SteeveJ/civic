import test from 'node:test';
import assert from 'node:assert/strict';
import { makeProcessText } from '../src/application/process-text.mjs';
import { makeQuota } from '../src/domain/quota.mjs';
import { loadConfig } from '../src/config.mjs';

const setup = (reply, limit = 5) => makeProcessText({
  llm: { complete: async (_s, text) => typeof reply === 'function' ? reply(text) : reply },
  scrubber: { clean: async t => t.replace(/\u200b/g, '') },
  quota: makeQuota(limit),
});

test('runs a text mode through llm and scrubber', async () => {
  const run = setup(text => { assert.match(text, /<texte>\nsalut\n<\/texte>/); return 'bon\u200bjour'; });
  assert.deepEqual(await run('transform', { text: 'salut', tone: 'humor', mode: 'reply' }, 'ip'), { output_text: 'bonjour' });
});

test('parses JSON modes and maps failures to codes', async () => {
  assert.deepEqual(await setup('```{"score": 7}```')('bullshit_score', { text: 'x' }, 'ip'), { result: { score: 7 } });
  await assert.rejects(setup('pas du json')('antidote', { text: 'x' }, 'ip'), { code: 'parse' });
  await assert.rejects(setup('x')('nope', { text: 'x' }, 'ip'), { code: 'not_found' });
  await assert.rejects(setup('x')('reverse', { text: '' }, 'ip'), { code: 'invalid' });
  await assert.rejects(setup(() => { throw new Error('down'); })('reverse', { text: 'x' }, 'ip'), { code: 'unavailable' });
});

test('stops at the daily quota', async () => {
  const run = setup('ok', 1);
  await run('reverse', { text: 'x' }, 'ip');
  await assert.rejects(run('reverse', { text: 'x' }, 'ip'), { code: 'quota' });
});

test('config has defaults and rejects bad numbers', () => {
  assert.equal(loadConfig({}).port, 3000);
  assert.equal(loadConfig({ DAILY_LIMIT: '20' }).dailyLimit, 20);
  assert.throws(() => loadConfig({ PORT: 'abc' }), /PORT/);
});
