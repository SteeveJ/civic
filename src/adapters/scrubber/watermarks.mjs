import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('./vendor/watermarks/clean.py', import.meta.url));

// Scrubber port: strips invisible-Unicode watermarks (watermarks-remover Layer A) before the text leaves the server.
export function makeWatermarkScrubber({ python = 'python3' } = {}) {
  return {
    clean(text) {
      return new Promise((ok, ko) => {
        const p = execFile(python, ['-I', SCRIPT], { timeout: 10000, maxBuffer: 1 << 20 },
          (err, stdout) => err ? ko(err) : ok(stdout));
        p.stdin.end(text);
      });
    },
  };
}
