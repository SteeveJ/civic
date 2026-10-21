import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPrompt, extractJson } from '../src/domain/prompts.mjs';
import { makeQuota } from '../src/domain/quota.mjs';

test('buildPrompt validates input', () => {
  assert.throws(() => buildPrompt('transform', { text: '' }), /requis/);
  assert.throws(() => buildPrompt('transform', { text: 'x'.repeat(4001), tone: 'humor', mode: 'reply' }), /long/);
  assert.throws(() => buildPrompt('transform', { text: 'hi', tone: 'evil', mode: 'reply' }), /Ton/);
  assert.match(buildPrompt('transform', { text: 'hi', tone: 'humor', mode: 'reply', diplomacy: 80 }).system, /80\/100/);
  assert.equal(buildPrompt('bullshit_score', { text: 'hi' }).json, true);
});

test('extractJson strips fences', () => {
  assert.deepEqual(extractJson('```json\n{"score": 42}\n```'), { score: 42 });
  assert.throws(() => extractJson('nope'), /llm_parse_error/);
});

test('quota blocks after limit and resets next day', () => {
  let d = new Date('2026-10-20T10:00:00Z');
  const q = makeQuota(2, () => d);
  assert.ok(q.take('a')); assert.ok(q.take('a')); assert.equal(q.take('a'), false);
  assert.ok(q.take('b'));
  d = new Date('2026-10-21T00:00:01Z');
  assert.ok(q.take('a'));
});
