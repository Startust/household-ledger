import { createApp } from './bootstrap.js';
import { Config } from './config.js';

const app = await createApp();
const config = app.get(Config).values;
await app.listen(config.port, config.host);
console.log(`NestJS API listening on ${config.host}:${config.port}; docs: /api/docs`);
for (const name of ['SIGTERM', 'SIGINT'] as const)
  process.on(name, () => {
    void app.close().then(() => process.exit(0));
  });
