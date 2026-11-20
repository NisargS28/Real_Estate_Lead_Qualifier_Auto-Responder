import bcrypt from 'bcryptjs';
import express from 'express';
import { createApp } from './app.js';
import { config } from './config.js';
import { connectDb } from './db/connect.js';
import { Admin } from './db/models.js';
import { VoiceCall, VoiceEvent, VoiceNumberLock } from './db/voice.js';
import { errorHandler } from './http/middleware.js';

let initializing: Promise<void> | undefined;

async function initialize() {
  await connectDb();
  await Promise.all([Admin.init(), VoiceCall.init(), VoiceEvent.init(), VoiceNumberLock.init()]);
  const email = config.ADMIN_EMAIL.toLowerCase();
  const existing = await Admin.findOne({ email });
  if (!existing || !await bcrypt.compare(config.ADMIN_PASSWORD, existing.passwordHash)) {
    const passwordHash = await bcrypt.hash(config.ADMIN_PASSWORD, 12);
    await Admin.updateOne({ email }, { $set: { email, passwordHash } }, { upsert: true });
  }
}

// Vercel manages the listener; initialize once per instance without starting workers.
const app = express();
app.use((_req, _res, next) => {
  initializing ??= initialize().catch(error => {
    initializing = undefined;
    throw error;
  });
  void initializing.then(() => next(), next);
});
app.use(createApp());
app.use(errorHandler);
export default app;
