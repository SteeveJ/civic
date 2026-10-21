import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';

// LLM port backed by the Claude account logged in on this machine via the CLI (personal/local use only).
export function makeClaudeCliLlm({ model }) {
  return {
    complete(system, text) {
      return new Promise((ok, ko) => {
        const p = execFile('claude', ['-p', '--model', model, '--system-prompt', system, '--tools', '',
          '--strict-mcp-config', '--setting-sources', '', '--no-session-persistence'],
          { timeout: 120000, maxBuffer: 1 << 20, cwd: tmpdir() },
          (err, stdout, stderr) => err ? ko(new Error(`claude CLI: ${stderr || err.message}`)) : ok(stdout.trim()));
        p.stdin.end(text);
      });
    },
  };
}
