import type { OAuthServerProvider } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import { createMiddleware } from "hono/factory";

/**
 * Protect a route with an OAuth 2.1 Bearer access token. On failure responds 401
 * with a `WWW-Authenticate` header pointing at the protected-resource metadata, so
 * MCP clients can discover how to authorize.
 */
export function requireBearer(provider: OAuthServerProvider, resourceMetadataUrl: string) {
  const challenge = `Bearer resource_metadata="${resourceMetadataUrl}"`;
  return createMiddleware(async (c, next) => {
    const header = c.req.header("authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json({ error: "unauthorized" }, 401, { "WWW-Authenticate": challenge });
    }
    try {
      await provider.verifyAccessToken(header.slice("Bearer ".length));
    } catch {
      return c.json({ error: "invalid_token" }, 401, { "WWW-Authenticate": challenge });
    }
    return next();
  });
}
