/**
 * Integration tests: /register and /token. Uses mock Env + in-memory KV.
 */

import { describe, it, expect, beforeEach } from "vitest";
import worker from "./index.js";
import { createTestEnv } from "./test/mock-env.js";

const BASE = "http://localhost";

describe("POST /register", () => {
  const env = createTestEnv();

  it("returns 201 and client_id, client_name (no secret) for valid body", async () => {
    const res = await worker.fetch(
      new Request(`${BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: "test-client-1",
          client_secret: "secret12345",
          client_name: "Test App",
        }),
      }),
      env
    );
    expect(res.status).toBe(201);
    const data = (await res.json()) as { client_id: string; client_name: string };
    expect(data.client_id).toBe("test-client-1");
    expect(data.client_name).toBe("Test App");
    expect(data).not.toHaveProperty("client_secret");
  });

  it("returns 409 when client_id already registered", async () => {
    await worker.fetch(
      new Request(`${BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: "dup-client",
          client_secret: "secret12345",
          client_name: "First",
        }),
      }),
      env
    );
    const res = await worker.fetch(
      new Request(`${BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: "dup-client",
          client_secret: "othersecret",
          client_name: "Second",
        }),
      }),
      env
    );
    expect(res.status).toBe(409);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBeDefined();
  });

  it("returns 400 when client_id contains invalid char (e.g. :)", async () => {
    const res = await worker.fetch(
      new Request(`${BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: "invalid:id",
          client_secret: "secret12345",
          client_name: "Test",
        }),
      }),
      env
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string; error_description?: string };
    expect(data.error).toBeDefined();
    expect(data.error_description).toBeDefined();
  });

  it("returns 400 when client_secret too short", async () => {
    const res = await worker.fetch(
      new Request(`${BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: "validid",
          client_secret: "short",
          client_name: "Test",
        }),
      }),
      env
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /register/:client_id", () => {
  const env = createTestEnv();

  it("returns 200 with client_id, client_name when found", async () => {
    await worker.fetch(
      new Request(`${BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: "get-test-client",
          client_secret: "secret12345",
          client_name: "Get Test",
        }),
      }),
      env
    );
    const res = await worker.fetch(
      new Request(`${BASE}/register/get-test-client`),
      env
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { client_id: string; client_name: string };
    expect(data.client_id).toBe("get-test-client");
    expect(data.client_name).toBe("Get Test");
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

  beforeEach(async () => {
    await worker.fetch(
      new Request(`${BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: "token-test-client",
          client_secret: "token-secret-123",
          client_name: "Token Test",
        }),
      }),
      env
    );
  });

  it("returns 200 with access_token, token_type Bearer, expires_in for valid credentials", async () => {
    const res = await worker.fetch(
      new Request(`${BASE}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: "token-test-client",
          client_secret: "token-secret-123",
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
          client_id: "token-test-client",
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
          client_id: "token-test-client",
          client_secret: "token-secret-123",
        }).toString(),
      }),
      env
    );
    expect(res.status).toBe(400);
  });
});
