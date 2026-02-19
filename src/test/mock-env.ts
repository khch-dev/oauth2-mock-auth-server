/**
 * Mock Env and KV for Vitest (no miniflare). In-memory KV.
 */

import type { Env } from "../config.js";

function createMockKV(): KVNamespace {
  const map = new Map<string, string>();
  return {
    get: async (key: string) => map.get(key) ?? null,
    put: async (key: string, value: string) => {
      map.set(key, value);
    },
    delete: async (key: string) => {
      map.delete(key);
    },
    list: async () => ({ keys: [], list_complete: true }),
  };
}

export function createTestEnv(overrides: Partial<Env> = {}): Env {
  return {
    CLIENTS_KV: createMockKV(),
    JWT_SECRET: "test-secret-at-least-32-characters-long",
    JWT_ISSUER: "http://localhost",
    JWT_EXPIRES_IN_SECONDS: "3600",
    ...overrides,
  };
}
