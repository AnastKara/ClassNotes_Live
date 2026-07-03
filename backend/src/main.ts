import dotenv from "dotenv";

dotenv.config();

import { buildApp } from "./server/build-app.js";

const app = await buildApp();

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
  app.log.info({ port, host }, "backend listening");
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

