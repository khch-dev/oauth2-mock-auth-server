/**
 * OAuth 2.0 Mock Auth Server - Worker entry. Hono app, /token and /register.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./config.js";
import { tokenRoutes } from "./routes/token.js";
import { registerRoutes } from "./routes/register.js";

const app = new Hono<{ Bindings: Env }>();

app.use("/*", cors({ origin: "*", allowMethods: ["GET", "POST", "OPTIONS"] }));

app.route("/token", tokenRoutes);
app.route("/register", registerRoutes);

app.get("/", (c) => c.json({ name: "oauth2-mock-auth-server", endpoints: ["/token", "/register"] }));

export default {
  fetch: app.fetch,
};
