import { createHash, randomBytes } from "node:crypto";

const base64url = (buf: Buffer) => buf.toString("base64url");

/**
 * Drive the full OAuth flow against a running server and return an access token:
 * login → dynamic client registration → authorize (with the session) → token.
 */
interface AuthServerMetadata {
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint: string;
}

export async function getAccessToken(
  baseUrl: string,
  creds: { name: string; password: string },
): Promise<string> {
  // 0. Discover the OAuth endpoints from the well-known metadata.
  const discovery = await fetch(`${baseUrl}/.well-known/oauth-authorization-server`);
  const meta = (await discovery.json()) as AuthServerMetadata;

  // 1. Log in for a session cookie.
  const login = await fetch(`${baseUrl}/login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(creds),
    redirect: "manual",
  });
  const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0] ?? "";

  // 2. Register a public client (RFC 7591).
  const reg = await fetch(meta.registration_endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      redirect_uris: ["http://localhost/callback"],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    }),
  });
  const client = (await reg.json()) as { client_id: string };

  // 3. PKCE pair.
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());

  // 4. Authorize with the session cookie; grab the code from the redirect.
  const authorize = new URL(meta.authorization_endpoint);
  authorize.search = new URLSearchParams({
    response_type: "code",
    client_id: client.client_id,
    redirect_uri: "http://localhost/callback",
    code_challenge: challenge,
    code_challenge_method: "S256",
    resource: `${baseUrl}/mcp`,
    state: "xyz",
  }).toString();
  const authed = await fetch(authorize, { headers: { cookie }, redirect: "manual" });
  const location = authed.headers.get("location");
  if (!location) {
    throw new Error(`authorize did not redirect (status ${authed.status})`);
  }
  const code = new URL(location).searchParams.get("code");
  if (!code) {
    throw new Error(`no authorization code in redirect: ${location}`);
  }

  // 5. Exchange the code for tokens.
  const token = await fetch(meta.token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: "http://localhost/callback",
      client_id: client.client_id,
      code_verifier: verifier,
    }),
  });
  const tokens = (await token.json()) as { access_token?: string };
  if (!tokens.access_token) {
    throw new Error(`no access_token (status ${token.status}): ${JSON.stringify(tokens)}`);
  }
  return tokens.access_token;
}
