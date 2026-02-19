/**
 * Cloudflare KV-backed client store (key prefix "client:" to avoid collisions)
 */

import type { Client } from "../types.js";
import type { Env } from "../config.js";
import { getClientsKv } from "../config.js";

const KEY_PREFIX = "client:";

function kvKey(clientId: string): string {
  return KEY_PREFIX + clientId;
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
