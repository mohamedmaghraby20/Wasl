import 'dotenv/config';
import * as assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';

async function availablePort(): Promise<number> {
  const probe = createServer();
  await new Promise<void>((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolve);
  });
  const port = (probe.address() as { port: number }).port;
  await new Promise<void>((resolve, reject) =>
    probe.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}

async function main(): Promise<void> {
  const port = await availablePort();
  const api = spawn(process.execPath, ['dist/main.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port) },
    windowsHide: true,
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  const errors: string[] = [];
  api.stderr?.on('data', (chunk: Buffer) => errors.push(chunk.toString('utf8')));
  const url = `http://127.0.0.1:${port}/api/v1`;

  try {
    let health: Response | undefined;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (api.exitCode !== null)
        throw new Error(`API exited before becoming ready: ${errors.join('')}`);
      try {
        health = await fetch(`${url}/health`);
        if (health.ok) break;
      } catch {
        // The child server is still starting.
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    assert.equal(health?.status, 200, 'Nest API must become healthy before security checks');
    assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
    const origin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
    const allowed = await fetch(`${url}/health`, { headers: { origin } });
    assert.equal(allowed.headers.get('access-control-allow-origin'), origin);
    const rejected = await fetch(`${url}/health`, {
      headers: { origin: 'https://untrusted.example' },
    });
    assert.notEqual(
      rejected.headers.get('access-control-allow-origin'),
      'https://untrusted.example',
    );

    const denied = await fetch(`${url}/reports`, { method: 'POST' });
    assert.equal(denied.status, 401, 'unauthenticated reports must not reach the handler');
    let limited = false;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await fetch(`${url}/reports`, { method: 'POST' });
      if (response.status === 429) {
        limited = true;
        break;
      }
      assert.equal(response.status, 401);
    }
    assert.equal(limited, true, 'repeated report requests must be throttled');
    console.log(
      'Security headers, CORS, unauthenticated report denial and report throttling passed.',
    );
  } finally {
    await stop(api);
  }
}

async function stop(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) return;
  const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
  child.kill('SIGTERM');
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 5000))]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

void main();
