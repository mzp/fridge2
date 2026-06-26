import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import type { Db } from "@/db/index.js";
import { users } from "@/db/schema.js";
import { seedAdmin } from "@/db/seed.js";
import { mcpHandler } from "@/mcp/index.js";
import { requestLogger } from "@/middlewares/logger.js";
import { requireBearer } from "@/middlewares/oauth.js";
import { type AppEnv, sessionMiddleware } from "@/middlewares/session.js";
import { createAuthRoutes } from "@/routes/auth.js";
import { createHomeRoutes } from "@/routes/home.js";
import {
  createOAuthProvider,
  createOAuthRoutes,
  createWellKnownRoutes,
  type OAuthConfig,
} from "@/routes/oauth/index.js";

/**
 * Absolute base URL used as the OAuth issuer and in discovery metadata. Must be
 * stable per deployment. Render injects RENDER_EXTERNAL_URL automatically; locally
 * it defaults to :3000. Override with PUBLIC_BASE_URL (e.g. a tunnel URL).
 */
function resolveBaseUrl(): string {
  return (
    process.env["PUBLIC_BASE_URL"] ?? process.env["RENDER_EXTERNAL_URL"] ?? "http://localhost:3000"
  );
}

export function createApp(db: Db) {
  const app = new Hono<AppEnv>();
  const baseUrl = resolveBaseUrl();

  app.get("/health", (c) => c.json({ status: "ok" }));
  // Compiled Tailwind stylesheet. Before the session middleware — a static asset
  // needs no session.
  app.use("/dist.css", serveStatic({ path: "./public/dist.css" }));

  // Log everything below (health/dist.css above are skipped to avoid noise).
  app.use("*", requestLogger);

  // OAuth authorization server. The provider reuses the login session at
  // /authorize; discovery metadata is served at the well-known root, the operation
  // endpoints under /oauth. Config (issuer, name) is owned here.
  const provider = createOAuthProvider(db);
  const oauth: OAuthConfig = { baseUrl, resourceName: "Fridge MCP" };
  app.route("/", createWellKnownRoutes(provider, oauth));
  app.route("/oauth", createOAuthRoutes(provider));

  // MCP over Streamable HTTP, protected by a Bearer access token.
  app.use("/mcp", requireBearer(provider, `${baseUrl}/.well-known/oauth-protected-resource`));
  app.all("/mcp", mcpHandler(db));

  app.use("*", sessionMiddleware(db));
  app.route("/", createAuthRoutes(db));
  app.route("/", createHomeRoutes());

  // Test-only: clear app data and re-seed the admin, for E2E isolation between
  // tests. Gated to NODE_ENV=test so it never exists in production.
  if (process.env["NODE_ENV"] === "test") {
    app.post("/__test__/reset", async (c) => {
      await db.delete(users);
      await seedAdmin(db);
      return c.body(null, 204);
    });
  }

  return app;
}
