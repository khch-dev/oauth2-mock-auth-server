/**
 * OAuth 2.0 Token endpoint - Client Credentials Grant (RFC 6749).
 * POST /token with application/x-www-form-urlencoded: grant_type, client_id, client_secret.
 */

import { Hono } from "hono";
import type { Env } from "../config.js";
import type { TokenResponse, OAuthErrorBody } from "../types.js";
import { getById } from "../store/clients-kv.js";
import { sign } from "../services/jwt.js";
import { getJwtExpiresIn } from "../config.js";

function errorBody(error: string, error_description: string): OAuthErrorBody {
  return { error, error_description };
}

export const tokenRoutes = new Hono<{ Bindings: Env }>().post("/", async (c) => {
  const contentType = c.req.header("Content-Type") ?? "";
  if (!contentType.includes("application/x-www-form-urlencoded")) {
    return c.json(
      errorBody("invalid_request", "Content-Type must be application/x-www-form-urlencoded"),
      400,
      { "Content-Type": "application/json" }
    );
  }

  let body: Record<string, string>;
  try {
    body = (await c.req.parseBody()) as Record<string, string>;
  } catch {
    return c.json(errorBody("invalid_request", "Invalid form body"), 400, {
      "Content-Type": "application/json",
    });
  }

  const grant_type = body["grant_type"];
  const client_id = body["client_id"];
  const client_secret = body["client_secret"];

  if (grant_type !== "client_credentials") {
    return c.json(
      errorBody("unsupported_grant_type", "grant_type must be client_credentials"),
      400,
      { "Content-Type": "application/json" }
    );
  }
  if (!client_id || !client_secret) {
    return c.json(
      errorBody("invalid_request", "client_id and client_secret required"),
      400,
      { "Content-Type": "application/json" }
    );
  }

  const client = await getById(c.env, client_id);
  if (!client || client.client_secret !== client_secret) {
    return c.json(
      errorBody("invalid_client", "Invalid client credentials"),
      401,
      { "Content-Type": "application/json" }
    );
  }

  const issuerFallback = new URL(c.req.url).origin;
  const access_token = await sign(c.env, client_id, issuerFallback);
  const expires_in = getJwtExpiresIn(c.env);
  const response: TokenResponse = {
    access_token,
    token_type: "Bearer",
    expires_in,
  };
  return c.json(response, 200, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Pragma": "no-cache",
  });
});
