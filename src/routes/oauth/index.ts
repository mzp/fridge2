import {
  authenticateClient,
  authorizeHandler,
  clientRegistrationHandler,
  createOAuthMetadata,
  revokeHandler,
  tokenHandler,
  wellKnownRouter,
} from "@hono/mcp/auth";
import type { OAuthServerProvider } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import { Hono } from "hono";

export { createOAuthProvider } from "@/routes/oauth/provider.js";

export interface OAuthConfig {
  /** Absolute issuer/base URL. */
  baseUrl: string;
  /** Human-readable name shown in the protected-resource metadata. */
  resourceName: string;
  /** OAuth scopes advertised by the server. */
  scopes: string[];
}

/**
 * Discovery documents served at the well-known root (per spec). The metadata
 * advertises the operation endpoints, which live under /oauth (see
 * {@link createOAuthRoutes}).
 */
export function createWellKnownRoutes(provider: OAuthServerProvider, config: OAuthConfig) {
  const metadata = createOAuthMetadata({
    provider,
    issuerUrl: new URL(config.baseUrl),
    scopesSupported: config.scopes,
  });
  metadata.authorization_endpoint = `${config.baseUrl}/oauth/authorize`;
  metadata.token_endpoint = `${config.baseUrl}/oauth/token`;
  metadata.registration_endpoint = `${config.baseUrl}/oauth/register`;
  metadata.revocation_endpoint = `${config.baseUrl}/oauth/revoke`;

  return wellKnownRouter({
    oauthMetadata: metadata,
    resourceServerUrl: new URL(config.baseUrl),
    resourceName: config.resourceName,
    scopesSupported: config.scopes,
  });
}

/** OAuth operation endpoints, mounted at /oauth (token/revoke authenticate the client). */
export function createOAuthRoutes(provider: OAuthServerProvider) {
  const app = new Hono();
  app.on(["GET", "POST"], "/authorize", authorizeHandler(provider));
  app.post("/register", clientRegistrationHandler({ clientsStore: provider.clientsStore }));
  const clientAuth = authenticateClient({ clientsStore: provider.clientsStore });
  app.post("/token", clientAuth, tokenHandler(provider));
  app.post("/revoke", clientAuth, revokeHandler(provider));
  return app;
}
