/**
 * Client registration API (RFC 7591 style). POST /register, GET /register/:client_id.
 * Auto-approve; validation: client_id (alphanumeric, -, _, 1-128, no ':'), client_secret min 8.
 */

import { Hono } from "hono";
import type { Env } from "../config.js";
import type { RegisterRequest, ClientPublic, OAuthErrorBody } from "../types.js";
import { getById, save } from "../store/clients-kv.js";

const CLIENT_ID_MIN = 1;
const CLIENT_ID_MAX = 128;
const CLIENT_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const CLIENT_SECRET_MIN = 8;

function validateClientId(clientId: unknown): string | null {
  if (typeof clientId !== "string") return null;
  if (clientId.length < CLIENT_ID_MIN || clientId.length > CLIENT_ID_MAX) return null;
  if (clientId.includes(":") || !CLIENT_ID_REGEX.test(clientId)) return null;
  return clientId;
}

function validateClientSecret(secret: unknown): string | null {
  if (typeof secret !== "string") return null;
  if (secret.length < CLIENT_SECRET_MIN) return null;
  return secret;
}

function validateClientName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  if (name.trim().length === 0) return null;
  return name.trim();
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
    const client_id = validateClientId(raw.client_id);
    const client_secret = validateClientSecret(raw.client_secret);
    const client_name = validateClientName(raw.client_name);

    if (!client_id) {
      return c.json(
        errorBody("invalid_request", "client_id required: alphanumeric, -, _, 1-128 chars, no ':'"),
        400,
        { "Content-Type": "application/json" }
      );
    }
    if (!client_secret) {
      return c.json(
        errorBody("invalid_request", "client_secret required, min 8 characters"),
        400,
        { "Content-Type": "application/json" }
      );
    }
    if (!client_name) {
      return c.json(
        errorBody("invalid_request", "client_name required"),
        400,
        { "Content-Type": "application/json" }
      );
    }

    const existing = await getById(c.env, client_id);
    if (existing) {
      return c.json(
        errorBody("invalid_client", "client_id already registered"),
        409,
        { "Content-Type": "application/json" }
      );
    }

    const client: RegisterRequest = { client_id, client_secret, client_name };
    await save(c.env, client);

    const publicMeta: ClientPublic = { client_id, client_name };
    return c.json(publicMeta, 201, { "Content-Type": "application/json" });
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
