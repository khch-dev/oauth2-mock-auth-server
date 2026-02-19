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
  const expiresIn = getJwtExpiresIn(env);
  const key = new TextEncoder().encode(secret);
  const jwt = await new jose.SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(issuer)
    .setSubject(clientId)
    .setIssuedAt(Math.floor(Date.now() / 1000))
    .setExpirationTime(expiresIn)
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
