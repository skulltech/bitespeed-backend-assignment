import type { VercelRequest, VercelResponse } from "@vercel/node";
import { app } from "../src/app";

export default async (request: VercelRequest, response: VercelResponse) => {
  await app.ready();
  app.server.emit("request", request, response);
};
