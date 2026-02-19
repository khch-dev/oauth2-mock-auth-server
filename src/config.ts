/**
 * Config helpers - read from Worker env (bindings + vars/secrets)
 */

export interface Env {
  CLIENTS_KV: KVNamespace;
  JWT_SECRET?: string;
  JWT_ISSUER?: string;
  JWT_EXPIRES_IN_SECONDS?: string;
}

const DEFAULT_JWT_EXPIRES_IN_SECONDS = 3600;

export function getJwtSecret(env: Env): string {
  const secret = env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
}

export function getJwtIssuer(env: Env, fallback: string): string {
  return env.JWT_ISSUER ?? fallback;
}

export function getJwtExpiresIn(env: Env): number {
  const v = env.JWT_EXPIRES_IN_SECONDS;
  if (v === undefined || v === "") return DEFAULT_JWT_EXPIRES_IN_SECONDS;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_JWT_EXPIRES_IN_SECONDS;
}

export function getClientsKv(env: Env): KVNamespace {
  return env.CLIENTS_KV;
}
