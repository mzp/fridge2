import { createHash, randomBytes } from "node:crypto";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import type { OAuthServerProvider } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type {
  OAuthClientInformationFull,
  OAuthTokenRevocationRequest,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import type { Db } from "@/db/index.js";
import { oauthAuthCodes, oauthClients, oauthTokens } from "@/db/schema.js";
import { getSessionUser } from "@/middlewares/session.js";

const ACCESS_TTL_SECONDS = 60 * 60; // 1 hour
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const CODE_TTL_SECONDS = 60; // 1 minute

const secret = () => randomBytes(32).toString("hex");
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

interface Grant {
  clientId: string;
  userId: string;
  scopes: string[];
  resource: string | null;
}

async function issueTokens(db: Db, grant: Grant): Promise<OAuthTokens> {
  const accessToken = secret();
  const refreshToken = secret();
  const now = Date.now();

  await db.insert(oauthTokens).values([
    {
      tokenHash: sha256(accessToken),
      kind: "access",
      clientId: grant.clientId,
      userId: grant.userId,
      scopes: grant.scopes,
      resource: grant.resource,
      expiresAt: new Date(now + ACCESS_TTL_SECONDS * 1000),
    },
    {
      tokenHash: sha256(refreshToken),
      kind: "refresh",
      clientId: grant.clientId,
      userId: grant.userId,
      scopes: grant.scopes,
      resource: grant.resource,
      expiresAt: new Date(now + REFRESH_TTL_SECONDS * 1000),
    },
  ]);

  const tokens: OAuthTokens = {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TTL_SECONDS,
    refresh_token: refreshToken,
  };
  const scope = grant.scopes.join(" ");
  if (scope) {
    tokens.scope = scope;
  }
  return tokens;
}

/**
 * Fridge acts as its own OAuth 2.1 authorization server. Clients register via DCR,
 * the existing login session authenticates the user at /authorize (single admin →
 * auto-approve), and opaque tokens are stored as SHA-256 hashes in Postgres.
 */
export function createOAuthProvider(db: Db): OAuthServerProvider {
  const clientsStore: OAuthRegisteredClientsStore = {
    async getClient(clientId) {
      const row = await db.query.oauthClients.findFirst({
        where: eq(oauthClients.clientId, clientId),
      });
      return row?.info;
    },
    async registerClient(client) {
      const info: OAuthClientInformationFull = {
        ...client,
        client_id: randomBytes(16).toString("hex"),
        client_id_issued_at: Math.floor(Date.now() / 1000),
      };
      await db.insert(oauthClients).values({ clientId: info.client_id, info });
      return info;
    },
  };

  return {
    clientsStore,

    // @hono/mcp passes a Hono Context here (the SDK type infers `res` as express
    // Response, so cast it to what actually arrives at runtime).
    async authorize(client, params, res) {
      const c = res as unknown as Context;
      const user = await getSessionUser(c, db);
      if (!user) {
        const here = new URL(c.req.url);
        const returnTo = encodeURIComponent(here.pathname + here.search);
        // authorizeHandler returns `c.res`, so set it (don't just return a Response).
        c.res = c.redirect(`/login?return=${returnTo}`);
        return;
      }

      const code = secret();
      await db.insert(oauthAuthCodes).values({
        code,
        clientId: client.client_id,
        userId: user.id,
        redirectUri: params.redirectUri,
        codeChallenge: params.codeChallenge,
        scopes: params.scopes ?? [],
        resource: params.resource?.href ?? null,
        expiresAt: new Date(Date.now() + CODE_TTL_SECONDS * 1000),
      });

      const redirect = new URL(params.redirectUri);
      redirect.searchParams.set("code", code);
      if (params.state) {
        redirect.searchParams.set("state", params.state);
      }
      c.res = c.redirect(redirect.toString());
    },

    async challengeForAuthorizationCode(client, authorizationCode) {
      const row = await db.query.oauthAuthCodes.findFirst({
        where: eq(oauthAuthCodes.code, authorizationCode),
      });
      if (!row || row.clientId !== client.client_id) {
        throw new Error("invalid authorization code");
      }
      return row.codeChallenge;
    },

    async exchangeAuthorizationCode(client, authorizationCode, _verifier, redirectUri) {
      const row = await db.query.oauthAuthCodes.findFirst({
        where: eq(oauthAuthCodes.code, authorizationCode),
      });
      if (!row || row.clientId !== client.client_id) {
        throw new Error("invalid authorization code");
      }
      // Authorization codes are single-use.
      await db.delete(oauthAuthCodes).where(eq(oauthAuthCodes.code, authorizationCode));
      if (row.expiresAt.getTime() < Date.now()) {
        throw new Error("authorization code expired");
      }
      if (redirectUri && redirectUri !== row.redirectUri) {
        throw new Error("redirect_uri mismatch");
      }
      return issueTokens(db, {
        clientId: client.client_id,
        userId: row.userId,
        scopes: row.scopes,
        resource: row.resource,
      });
    },

    async exchangeRefreshToken(client, refreshToken, scopes) {
      const row = await db.query.oauthTokens.findFirst({
        where: eq(oauthTokens.tokenHash, sha256(refreshToken)),
      });
      if (row?.kind !== "refresh" || row.clientId !== client.client_id) {
        throw new Error("invalid refresh token");
      }
      // Rotate the refresh token.
      await db.delete(oauthTokens).where(eq(oauthTokens.tokenHash, sha256(refreshToken)));
      return issueTokens(db, {
        clientId: client.client_id,
        userId: row.userId,
        scopes: scopes ?? row.scopes,
        resource: row.resource,
      });
    },

    async verifyAccessToken(token) {
      const row = await db.query.oauthTokens.findFirst({
        where: eq(oauthTokens.tokenHash, sha256(token)),
      });
      if (row?.kind !== "access") {
        throw new Error("invalid access token");
      }
      if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
        throw new Error("access token expired");
      }
      const info: AuthInfo = {
        token,
        clientId: row.clientId,
        scopes: row.scopes,
        extra: { userId: row.userId },
      };
      if (row.expiresAt) {
        info.expiresAt = Math.floor(row.expiresAt.getTime() / 1000);
      }
      if (row.resource) {
        info.resource = new URL(row.resource);
      }
      return info;
    },

    async revokeToken(_client, request: OAuthTokenRevocationRequest) {
      await db.delete(oauthTokens).where(eq(oauthTokens.tokenHash, sha256(request.token)));
    },
  };
}
