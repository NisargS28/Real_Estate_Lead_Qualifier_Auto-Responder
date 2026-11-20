import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  connect: vi.fn(async () => {}),
  init: vi.fn(async () => {}),
  findAdmin: vi.fn(async () => ({ passwordHash: 'existing' })),
  compare: vi.fn(async () => true),
}));
vi.mock('../../src/db/connect.js', () => ({ connectDb: mocks.connect }));
vi.mock('../../src/db/models.js', () => ({ Admin: { init: mocks.init, findOne: mocks.findAdmin } }));
vi.mock('../../src/db/voice.js', () => ({
  VoiceCall: { init: mocks.init }, VoiceEvent: { init: mocks.init }, VoiceNumberLock: { init: mocks.init },
}));
vi.mock('bcryptjs', () => ({ default: { compare: mocks.compare } }));
vi.mock('../../src/app.js', () => ({ createApp: () => {
  const app = express();
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  return app;
} }));
vi.mock('../../src/http/middleware.js', () => ({ errorHandler: (err: unknown, _req: unknown, res: express.Response, _next: unknown) => res.status(500).json({ ok: false }) }));

let server: ReturnType<express.Express['listen']> | undefined;
afterEach(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise<void>(resolve => server!.close(() => resolve()));
    server = undefined;
  }
  vi.resetModules();
  vi.clearAllMocks();
});

async function start() {
  const { default: app } = await import('../../src/vercel-entry.js');
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server!.once('listening', resolve));
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}

describe('Vercel entrypoint', () => {
  it('initializes once across requests and retains the API prefix', async () => {
    const origin = await start();
    const responses = await Promise.all([fetch(`${origin}/api/health`), fetch(`${origin}/api/health`)]);
    expect(responses.map(response => response.status)).toEqual([200, 200]);
    expect(mocks.connect).toHaveBeenCalledOnce();
    expect(mocks.init).toHaveBeenCalledTimes(4);
    expect((await fetch(`${origin}/health`)).status).toBe(404);
  });

  it('retries initialization after a failed database connection', async () => {
    mocks.connect.mockRejectedValueOnce(new Error('unavailable'));
    const origin = await start();
    expect((await fetch(`${origin}/api/health`)).status).toBe(500);
    expect((await fetch(`${origin}/api/health`)).status).toBe(200);
    expect(mocks.connect).toHaveBeenCalledTimes(2);
  });
});
