/**
 * Integration tests: /register and /token. Server-issued client_id/client_secret;
 * only client_name "nhnace-ai-search-test" allowed for registration.
 */

import { describe, it, expect, beforeEach } from "vitest";
import worker from "./index.js";
import { createTestEnv } from "./test/mock-env.js";

const BASE = "http://localhost";
const ALLOWED_CLIENT_NAME = "nhnace-ai-search-test";

describe("POST /register", () => {
  const env = createTestEnv();

  it("returns 201 with server-issued client_id, client_secret, client_name when client_name is nhnace-ai-search-test", async () => {
    const res = await worker.fetch(
      new Request(`${BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_name: ALLOWED_CLIENT_NAME }),
      }),
      env
    );
    expect(res.status).toBe(201);
    const data = (await res.json()) as { client_id: string; client_secret: string; client_name: string };
    expect(data.client_id).toBeTruthy();
    expect(data.client_id.startsWith("nhnace_")).toBe(true);
    expect(data.client_secret).toBeTruthy();
    expect(data.client_name).toBe(ALLOWED_CLIENT_NAME);
  });

  it("returns 403 when client_name is not nhnace-ai-search-test", async () => {
    const res = await worker.fetch(
      new Request(`${BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_name: "other-app" }),
      }),
      env
    );
    expect(res.status).toBe(403);
    const data = (await res.json()) as { error: string; error_description?: string };
    expect(data.error).toBeDefined();
    expect(data.error_description).toContain("not allowed");
  });

  it("returns 400 when client_name is missing or empty", async () => {
    const res = await worker.fetch(
      new Request(`${BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      env
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBeDefined();
  });

  it("allows multiple registrations with same client_name; each gets unique client_id", async () => {
    const r1 = await worker.fetch(
      new Request(`${BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_name: ALLOWED_CLIENT_NAME }),
      }),
      env
    );
    const r2 = await worker.fetch(
      new Request(`${BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_name: ALLOWED_CLIENT_NAME }),
      }),
      env
    );
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
    const d1 = (await r1.json()) as { client_id: string };
    const d2 = (await r2.json()) as { client_id: string };
    expect(d1.client_id).not.toBe(d2.client_id);
  });
});

describe("GET /register/:client_id", () => {
  const env = createTestEnv();

  it("returns 200 with client_id, client_name when found (no secret)", async () => {
    const reg = await worker.fetch(
      new Request(`${BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_name: ALLOWED_CLIENT_NAME }),
      }),
      env
    );
    const regData = (await reg.json()) as { client_id: string; client_name: string };
    const res = await worker.fetch(
      new Request(`${BASE}/register/${regData.client_id}`),
      env
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { client_id: string; client_name: string };
    expect(data.client_id).toBe(regData.client_id);
    expect(data.client_name).toBe(regData.client_name);
    expect(data).not.toHaveProperty("client_secret");
  });

  it("returns 404 when client_id not found", async () => {
    const res = await worker.fetch(
      new Request(`${BASE}/register/nonexistent-id`),
      env
    );
    expect(res.status).toBe(404);
  });
});

describe("POST /token", () => {
  const env = createTestEnv();
  let client_id: string;
  let client_secret: string;

  beforeEach(async () => {
    const res = await worker.fetch(
      new Request(`${BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_name: ALLOWED_CLIENT_NAME }),
      }),
      env
    );
    const data = (await res.json()) as { client_id: string; client_secret: string };
    client_id = data.client_id;
    client_secret = data.client_secret;
  });

  it("returns 200 with access_token, token_type Bearer, expires_in for valid credentials", async () => {
    const res = await worker.fetch(
      new Request(`${BASE}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id,
          client_secret,
        }).toString(),
      }),
      env
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      access_token: string;
      token_type: string;
      expires_in: number;
    };
    expect(data.access_token).toBeTruthy();
    expect(data.token_type).toBe("Bearer");
    expect(data.expires_in).toBe(3600);
  });

  it("returns 401 for invalid client_id or client_secret", async () => {
    const res = await worker.fetch(
      new Request(`${BASE}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id,
          client_secret: "wrong-secret",
        }).toString(),
      }),
      env
    );
    expect(res.status).toBe(401);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBeDefined();
  });

  it("returns 400 when grant_type missing or wrong", async () => {
    const res = await worker.fetch(
      new Request(`${BASE}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "password",
          client_id,
          client_secret,
        }).toString(),
      }),
      env
    );
    expect(res.status).toBe(400);
  });
});
