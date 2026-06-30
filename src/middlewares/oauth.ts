import type { OAuthServerProvider } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "@/middlewares/session.js";

/**
 * Protect a route with an OAuth 2.1 Bearer access token. On failure responds 401
 * with a `WWW-Authenticate` header pointing at the protected-resource metadata, so
 * MCP clients can discover how to authorize.
 *
 * On success the token's owner is exposed as `c.var.userId`, so downstream
 * handlers (the MCP tools) can scope their data to the authenticated user.
 */
export function requireBearer(provider: OAuthServerProvider, resourceMetadataUrl: string) {
  const challenge = `Bearer resource_metadata="${resourceMetadataUrl}"`;
  return createMiddleware<AppEnv>(async (c, next) => {
    const header = c.req.header("authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json({ error: "unauthorized" }, 401, { "WWW-Authenticate": challenge });
    }
    let userId: string;
    try {
      const info = await provider.verifyAccessToken(header.slice("Bearer ".length));
      const owner = info.extra?.["userId"];
      if (typeof owner !== "string") {
        throw new Error("token is not bound to a user");
      }
      userId = owner;
    } catch {
      return c.json({ error: "invalid_token" }, 401, { "WWW-Authenticate": challenge });
    }
    c.set("userId", userId);
    return next();
  });
}
