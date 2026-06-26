import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";
import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// --- OAuth (MCP authorization server) ---

/** Dynamically registered OAuth clients (RFC 7591). */
export const oauthClients = pgTable("oauth_clients", {
  clientId: text("client_id").primaryKey(),
  info: jsonb("info").$type<OAuthClientInformationFull>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Short-lived authorization codes (PKCE), exchanged at the token endpoint. */
export const oauthAuthCodes = pgTable("oauth_authorization_codes", {
  code: text("code").primaryKey(),
  clientId: text("client_id").notNull(),
  userId: uuid("user_id").notNull(),
  redirectUri: text("redirect_uri").notNull(),
  codeChallenge: text("code_challenge").notNull(),
  scopes: text("scopes").array().notNull().default([]),
  resource: text("resource"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

/** Issued access and refresh tokens, stored as SHA-256 hashes. */
export const oauthTokens = pgTable("oauth_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  kind: text("kind").notNull(), // "access" | "refresh"
  clientId: text("client_id").notNull(),
  userId: uuid("user_id").notNull(),
  scopes: text("scopes").array().notNull().default([]),
  resource: text("resource"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});
