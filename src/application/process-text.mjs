import { buildPrompt, extractJson, KINDS } from '../domain/prompts.mjs';

// Errors carry a `code` the driving adapter maps to its own protocol (HTTP status, CLI exit code…).
const fail = (code, message) => Object.assign(new Error(message), { code });

// Use case: one text in, one processed text out. Ports: llm.complete(system, text), scrubber.clean(text), quota.take(id).
export function makeProcessText({ llm, scrubber, quota }) {
  return async function processText(kind, input, clientId) {
    if (!KINDS.includes(kind)) throw fail('not_found', 'Introuvable');
    let prompt;
    try { prompt = buildPrompt(kind, input); } catch (e) { throw fail('invalid', e.message); }
    if (!quota.take(clientId)) throw fail('quota', 'Quota du jour atteint, reviens demain.');

    // Wrapping stops the model from answering the text instead of processing it.
    const wrapped = `Texte à traiter :\n<texte>\n${prompt.text}\n</texte>`;
    let out;
    try { out = await scrubber.clean(await llm.complete(prompt.system, wrapped)); }
    catch (e) { console.error(e.message); throw fail('unavailable', 'Service indisponible, réessaie plus tard.'); }

    if (!prompt.json) return { output_text: out };
    try { return { result: extractJson(out) }; }
    catch { throw fail('parse', "Réponse de l'IA illisible, réessaie."); }
  };
}
