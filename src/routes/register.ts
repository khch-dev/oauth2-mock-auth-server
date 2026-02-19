/**
 * Client registration API. POST /register: server issues client_id and client_secret (KV).
 * Only client_name "nhnace-ai-search-test" is allowed; others get 403.
 * GET /register/:client_id: public metadata (no secret).
 */

import { Hono } from "hono";
import type { Env } from "../config.js";
import type { Client, ClientPublic, OAuthErrorBody, RegisterResponse } from "../types.js";
import { getById, save, generateClientCredentials } from "../store/clients-kv.js";

const ALLOWED_CLIENT_NAME = "nhnace-ai-search-test";

function validateClientName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const trimmed = name.trim();
  if (trimmed.length === 0) return null;
  return trimmed;
}

function errorBody(error: string, error_description: string): OAuthErrorBody {
  return { error, error_description };
}

export const registerRoutes = new Hono<{ Bindings: Env }>()
  .post("/", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json(errorBody("invalid_request", "Invalid JSON body"), 400, {
        "Content-Type": "application/json",
      });
    }
    const raw = body as Record<string, unknown>;
    const client_name = validateClientName(raw.client_name);

    if (!client_name) {
      return c.json(
        errorBody("invalid_request", "client_name is required and must be non-empty"),
        400,
        { "Content-Type": "application/json" }
      );
    }

    if (client_name !== ALLOWED_CLIENT_NAME) {
      return c.json(
        errorBody("access_denied", "Registration is not allowed for this client_name"),
        403,
        { "Content-Type": "application/json" }
      );
    }

    let client_id: string;
    let client_secret: string;
    let existing: Awaited<ReturnType<typeof getById>>;
    let attempts = 0;
    do {
      const creds = generateClientCredentials();
      client_id = creds.client_id;
      client_secret = creds.client_secret;
      existing = await getById(c.env, client_id);
      attempts++;
    } while (existing && attempts < 5);
    if (existing) {
      return c.json(errorBody("server_error", "Failed to generate unique client_id"), 500, {
        "Content-Type": "application/json",
      });
    }

    const client: Client = { client_id, client_secret, client_name };
    await save(c.env, client);

    const response: RegisterResponse = { client_id, client_secret, client_name };
    return c.json(response, 201, { "Content-Type": "application/json" });
  })
  .get("/:client_id", async (c) => {
    const client_id = c.req.param("client_id");
    const client = await getById(c.env, client_id);
    if (!client) {
      return c.json(errorBody("invalid_client", "client not found"), 404, {
        "Content-Type": "application/json",
      });
    }
    const publicMeta: ClientPublic = { client_id: client.client_id, client_name: client.client_name };
    return c.json(publicMeta, 200, { "Content-Type": "application/json" });
  });
