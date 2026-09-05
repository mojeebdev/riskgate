import { getRuntimeBindings, type D1DatabaseLike, type RuntimeBindings } from "@/lib/storage/d1";

const AUTHORIZATION_ENDPOINT = "https://accounts.binance.com/agentic-oauth/authorize";
const TOKEN_ENDPOINT = "https://accounts.binance.com/oauth-agentic/token";
const MCP_RESOURCE = "https://agent.binance.com/mcp/agentic";
const STATE_MAX_AGE_MS = 10 * 60 * 1_000;

type StoredConnection = {
  encrypted_access_token: string;
  expires_at: string | null;
};

type OAuthState = {
  createdAt: number;
  redirectUri: string;
  verifier: string;
};

export type BinanceConnection =
  | { status: "connected"; accessToken: string; expiresAt: string | null }
  | { status: "disconnected" | "expired" | "not_configured" | "unavailable" };

function getString(env: RuntimeBindings, name: string) {
  const value = env[name];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function encodeBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function decodeBase64Url(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function randomBase64Url(bytes = 32) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return encodeBase64Url(value);
}

async function sha256Base64Url(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return encodeBase64Url(new Uint8Array(digest));
}

async function encryptionKey(secret: string) {
  const keyBytes = decodeBase64Url(secret);
  if (keyBytes.byteLength !== 32) {
    throw new Error("BINANCE_OAUTH_ENCRYPTION_KEY must be a 32-byte base64url value.");
  }
  return crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function seal(value: string, secret: string) {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(secret),
    new TextEncoder().encode(value),
  );
  return `v1.${encodeBase64Url(iv)}.${encodeBase64Url(new Uint8Array(ciphertext))}`;
}

async function open(value: string, secret: string) {
  const [version, ivValue, ciphertextValue] = value.split(".");
  if (version !== "v1" || !ivValue || !ciphertextValue) {
    throw new Error("Invalid encrypted Binance credential.");
  }
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decodeBase64Url(ivValue) },
    await encryptionKey(secret),
    decodeBase64Url(ciphertextValue),
  );
  return new TextDecoder().decode(plaintext);
}

async function matchesSecret(provided: string | null, expected: string | undefined) {
  if (!provided || !expected) return false;
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(provided)),
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(expected)),
  ]);
  const left = new Uint8Array(providedHash);
  const right = new Uint8Array(expectedHash);
  if (left.length !== right.length) return false;
  return left.every((byte, index) => byte === right[index]);
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
}

export async function isOwnerConnectRequest(request: Request) {
  const env = await getRuntimeBindings();
  return matchesSecret(bearerToken(request), getString(env, "BINANCE_CONNECT_ADMIN_TOKEN"));
}

function connectionConfig(env: RuntimeBindings) {
  const encryptionSecret = getString(env, "BINANCE_OAUTH_ENCRYPTION_KEY");
  const db = env.DB as D1DatabaseLike | undefined;
  return { db, encryptionSecret };
}

export async function getBinanceConnection(): Promise<BinanceConnection> {
  try {
    const { db, encryptionSecret } = connectionConfig(await getRuntimeBindings());
    if (!db || !encryptionSecret) return { status: "not_configured" };

    const stored = await db
      .prepare(
        `SELECT encrypted_access_token, expires_at
         FROM binance_oauth_connections WHERE id = 1`,
      )
      .first<StoredConnection>();
    if (!stored) return { status: "disconnected" };
    if (stored.expires_at && Date.parse(stored.expires_at) <= Date.now()) {
      return { status: "expired" };
    }

    return {
      status: "connected",
      accessToken: await open(stored.encrypted_access_token, encryptionSecret),
      expiresAt: stored.expires_at,
    };
  } catch {
    return { status: "unavailable" };
  }
}

export async function createBinanceAuthorizationUrl(request: Request) {
  const env = await getRuntimeBindings();
  const { db, encryptionSecret } = connectionConfig(env);
  if (!db || !encryptionSecret) {
    throw new Error("Binance OAuth is not configured.");
  }

  const origin = new URL(request.url).origin;
  const redirectUri = new URL("/api/binance/callback", origin).toString();
  const clientId = new URL("/.well-known/oauth-client-metadata.json", origin).toString();
  const verifier = randomBase64Url(48);
  const state = await seal(
    JSON.stringify({ createdAt: Date.now(), redirectUri, verifier } satisfies OAuthState),
    encryptionSecret,
  );
  const url = new URL(AUTHORIZATION_ENDPOINT);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: await sha256Base64Url(verifier),
    code_challenge_method: "S256",
    resource: MCP_RESOURCE,
    state,
  }).toString();
  return url.toString();
}

export async function finishBinanceAuthorization(request: Request) {
  const url = new URL(request.url);
  const authorizationCode = url.searchParams.get("code");
  const stateValue = url.searchParams.get("state");
  if (!authorizationCode || !stateValue) throw new Error("Missing Binance OAuth response.");

  const { db, encryptionSecret } = connectionConfig(await getRuntimeBindings());
  if (!db || !encryptionSecret) throw new Error("Binance OAuth is not configured.");

  const state = JSON.parse(await open(stateValue, encryptionSecret)) as OAuthState;
  if (
    !state.createdAt ||
    !state.redirectUri ||
    !state.verifier ||
    Date.now() - state.createdAt > STATE_MAX_AGE_MS ||
    state.redirectUri !== new URL("/api/binance/callback", url.origin).toString()
  ) {
    throw new Error("Expired or invalid Binance OAuth state.");
  }

  const tokenResponse = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: authorizationCode,
      client_id: new URL("/.well-known/oauth-client-metadata.json", url.origin).toString(),
      redirect_uri: state.redirectUri,
      code_verifier: state.verifier,
    }),
  });
  if (!tokenResponse.ok) throw new Error("Binance did not issue an access token.");
  const payload = (await tokenResponse.json()) as { access_token?: unknown; expires_in?: unknown };
  if (typeof payload.access_token !== "string" || !payload.access_token) {
    throw new Error("Binance returned an invalid access token.");
  }
  const expiresIn = typeof payload.expires_in === "number" && payload.expires_in > 0 ? payload.expires_in : null;
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1_000).toISOString() : null;

  await db
    .prepare(
      `INSERT INTO binance_oauth_connections (id, encrypted_access_token, expires_at, updated_at)
       VALUES (1, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         encrypted_access_token = excluded.encrypted_access_token,
         expires_at = excluded.expires_at,
         updated_at = excluded.updated_at`,
    )
    .bind(await seal(payload.access_token, encryptionSecret), expiresAt, new Date().toISOString())
    .run();
}
