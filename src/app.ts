import { mcpAuthRouter } from "@hono/mcp/auth";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { type AppEnv, sessionMiddleware } from "@/auth.js";
import type { Db } from "@/db/index.js";
import { users } from "@/db/schema.js";
import { seedAdmin } from "@/db/seed.js";
import { mcpHandler } from "@/mcp/index.js";
import { requireBearer } from "@/oauth/bearer.js";
import { createOAuthProvider } from "@/oauth/provider.js";
import { createAuthRoutes } from "@/routes/auth.js";
import { createHomeRoutes } from "@/routes/home.js";

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

  // OAuth authorization server: discovery metadata, dynamic client registration,
  // /authorize, /token, /revoke. The provider reuses the login session at
  // /authorize. Mounted before the web session middleware (these are API/token
  // endpoints, not cookie-session pages).
  const provider = createOAuthProvider(db);
  app.route(
    "/",
    mcpAuthRouter({
      provider,
      issuerUrl: new URL(baseUrl),
      scopesSupported: ["mcp"],
      resourceName: "Fridge MCP",
    }),
  );

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
