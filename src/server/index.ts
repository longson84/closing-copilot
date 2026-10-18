import { serve } from '@hono/node-server';
import { app } from './app.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { seedIfEmpty } from './seed.js';

await seedIfEmpty();
serve({ fetch: app.fetch, port: config.port }, () => logger.info({ port: config.port, model: config.model }, 'Closing Copilot listening'));
