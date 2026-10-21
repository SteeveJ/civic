// LLM port backed by the Anthropic Messages API.
export function makeAnthropicLlm({ apiKey, model }) {
  return {
    async complete(system, text) {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: 1024, system, messages: [{ role: 'user', content: text }] }),
      });
      if (!r.ok) throw new Error(`Anthropic ${r.status}: ${await r.text()}`);
      const data = await r.json();
      return data.content.filter(c => c.type === 'text').map(c => c.text).join('').trim();
    },
  };
}
