/**
 * JWT sign/verify using jose (Workers-compatible). HS256, iss/sub/exp.
 */

import * as jose from "jose";
import type { Env } from "../config.js";
import { getJwtSecret, getJwtIssuer, getJwtExpiresIn } from "../config.js";

export interface JwtPayload {
  iss: string;
  sub: string;
  exp: number;
  iat?: number;
}

export async function sign(
  env: Env,
  clientId: string,
  issuerFallback: string
): Promise<string> {
  const secret = getJwtSecret(env);
  const issuer = getJwtIssuer(env, issuerFallback);
  const expiresInSeconds = getJwtExpiresIn(env);
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresInSeconds; // RFC 7519: exp is Unix timestamp
  const key = new TextEncoder().encode(secret);
  const jwt = await new jose.SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(issuer)
    .setSubject(clientId)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(key);
  return jwt;
}

export async function verify(
  env: Env,
  token: string
): Promise<jose.JWTPayload> {
  const secret = getJwtSecret(env);
  const key = new TextEncoder().encode(secret);
  const { payload } = await jose.jwtVerify(token, key);
  return payload;
}
