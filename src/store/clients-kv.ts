/**
 * Cloudflare KV-backed client store (key prefix "client:" to avoid collisions).
 * Server-issued client_id and client_secret generated here.
 */

import type { Client } from "../types.js";
import type { Env } from "../config.js";
import { getClientsKv } from "../config.js";

const KEY_PREFIX = "client:";
const CLIENT_ID_PREFIX = "nhnace_";
const CLIENT_ID_BYTES = 16;
const CLIENT_SECRET_BYTES = 32;

function kvKey(clientId: string): string {
  return KEY_PREFIX + clientId;
}

function base64Url(bytes: Uint8Array): string {
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Generate a new client_id (prefix + random) and client_secret. */
export function generateClientCredentials(): { client_id: string; client_secret: string } {
  const idBytes = new Uint8Array(CLIENT_ID_BYTES);
  const secretBytes = new Uint8Array(CLIENT_SECRET_BYTES);
  crypto.getRandomValues(idBytes);
  crypto.getRandomValues(secretBytes);
  return {
    client_id: CLIENT_ID_PREFIX + base64Url(idBytes),
    client_secret: base64Url(secretBytes),
  };
}

export async function getById(env: Env, clientId: string): Promise<Client | null> {
  const kv = getClientsKv(env);
  const raw = await kv.get(kvKey(clientId));
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as Client;
  } catch {
    return null;
  }
}

export async function save(env: Env, client: Client): Promise<void> {
  const kv = getClientsKv(env);
  await kv.put(kvKey(client.client_id), JSON.stringify(client));
}
