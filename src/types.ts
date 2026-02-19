/**
 * OAuth 2.0 Mock Auth Server - shared types (RFC 7591 / RFC 6749 style)
 */

export interface Client {
  client_id: string;
  client_secret: string;
  client_name: string;
}

export interface RegisterRequest {
  client_id: string;
  client_secret: string;
  client_name: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface OAuthErrorBody {
  error: string;
  error_description?: string;
}

/** Client metadata returned from GET /register (no secret) */
export interface ClientPublic {
  client_id: string;
  client_name: string;
}
