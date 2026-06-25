import { serve } from "@hono/node-server";
import { createApp } from "@/web/app.js";

const port = process.env["PORT"] ? Number(process.env["PORT"]) : 3000;

serve({ fetch: createApp().fetch, port }, ({ port }) => {
  // biome-ignore lint/suspicious/noConsole: startup banner
  console.log(`Fridge listening on http://localhost:${port}`);
});
