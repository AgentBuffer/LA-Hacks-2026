# Platform OAuth Connections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire optional OAuth-based "connect your socials" for LinkedIn, X, Instagram, TikTok, and YouTube so AgentBuffer's brand agents can publish to a connected user's account in the background. None are required.

**Architecture:** All flows land tokens in the existing `platform_connections` Postgres table (RLS-scoped by `org_id`). Each platform gets a thin OAuth provider module (URL builder + token exchange) under `web/lib/oauth/providers/`, behind two shared dynamic routes — `/api/connect/[platform]/start` and `/api/connect/[platform]/callback`. State + PKCE round-trip via a single HttpOnly signed cookie (10-min TTL). On callback, an `auth_method` and a `status` (`active` | `demo_mode` | `needs_reconnect`) get written alongside tokens; platforms whose dev-app is unaudited (IG, TikTok, YouTube by default) land as `demo_mode`. The Publisher uAgent reads `status` before publishing and flips connections to `needs_reconnect` on 401/403 — no background refresh worker (Buffer-style passive reconnect pill instead).

**Tech Stack:** Next.js 15 (App Router) + server actions, Supabase (Postgres + Auth Hook for `org_id` in JWT), Python 3.12 uAgents (publisher), `@supabase/ssr`, native `fetch` for token exchange, Web Crypto for PKCE + HMAC.

---

## File Map

**Schema (1 file)**
- Create: `AgentBuffer-team/supabase/migrations/00009_platform_connection_status.sql`

**Web — shared OAuth core (4 files)**
- Create: `web/lib/oauth/types.ts` — `Platform`, `AuthMethod`, `ConnectionStatus` enums, `OAuthProvider` interface
- Create: `web/lib/oauth/state.ts` — sign + verify the state cookie (HMAC, 10-min TTL)
- Create: `web/lib/oauth/connections.ts` — `upsertConnection`, `markStatus`, `listConnections`
- Create: `web/lib/oauth/registry.ts` — `getProvider(platform)` → returns the provider module

**Web — per-platform providers (5 files)**
- Create: `web/lib/oauth/providers/linkedin.ts`
- Create: `web/lib/oauth/providers/x.ts` (PKCE)
- Create: `web/lib/oauth/providers/instagram.ts` (Business Login)
- Create: `web/lib/oauth/providers/tiktok.ts`
- Create: `web/lib/oauth/providers/youtube.ts` (Google OAuth)

**Web — routes + actions (3 files)**
- Create: `web/app/api/connect/[platform]/start/route.ts`
- Create: `web/app/api/connect/[platform]/callback/route.ts`
- Create: `web/actions/connections.ts` — `listConnectionsAction`, `disconnectAction`

**Web — UI (3 files)**
- Modify: `web/components/onboarding/connect-socials-step.tsx` — add Connect buttons + status badges next to existing URL inputs
- Create: `web/app/dashboard/settings/connections/page.tsx` — Settings → Connections page
- Create: `web/components/settings/connections-list.tsx` — list, disconnect, reconnect

**Python — publisher integration (2 files)**
- Modify: `AgentBuffer-team/services/shared/db.py` — add `update_platform_connection_status(brand_id, platform, status, last_error)`
- Modify: `AgentBuffer-team/services/publisher/agent.py` — read `status` in `publish_one`, flip to `needs_reconnect` on 401/403
- Test: `AgentBuffer-team/services/publisher/tests/test_publisher.py` — extend with status-handling tests

**Docs (1 file)**
- Modify: `CLAUDE.md` — append three decisions log rows

---

## Environment Variables (configure before Task 4)

Add to `web/.env.local` (the Next.js app reads these at runtime):

```
# OAuth state-cookie HMAC key (generate: openssl rand -hex 32)
OAUTH_STATE_SECRET=

# Public origin (used to build redirect_uri)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# LinkedIn (https://www.linkedin.com/developers/)
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

# X (https://developer.x.com/en/portal/dashboard)
X_OAUTH_CLIENT_ID=
X_OAUTH_CLIENT_SECRET=

# Meta (https://developers.facebook.com/apps/) — Instagram Business Login uses Meta app
META_APP_ID=
META_APP_SECRET=
META_APP_LIVE=false   # set to "true" only after IG App Review passes

# TikTok (https://developers.tiktok.com/apps)
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
TIKTOK_APP_AUDITED=false

# Google / YouTube (https://console.cloud.google.com/apis/credentials)
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_APP_VERIFIED=false
```

Each platform's redirect URI in their developer console: `${NEXT_PUBLIC_SITE_URL}/api/connect/<platform>/callback`. For local dev, register `http://localhost:3000/api/connect/<platform>/callback` per platform.

---

## Task 1: Schema migration — add `auth_method`, `status`, `last_publish_error` to `platform_connections`

**Files:**
- Create: `AgentBuffer-team/supabase/migrations/00009_platform_connection_status.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Track auth method (oauth2 vs app_password) and connection health.
-- Status drives Publisher behavior: 'active' publishes; 'demo_mode' publishes
-- but UI surfaces "demo only" badge; 'needs_reconnect' skips the slot and
-- surfaces the Buffer-style reconnect pill.

ALTER TABLE platform_connections
    ADD COLUMN auth_method TEXT NOT NULL DEFAULT 'oauth2'
        CHECK (auth_method IN ('oauth2', 'app_password')),
    ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'demo_mode', 'needs_reconnect', 'failed')),
    ADD COLUMN scopes JSONB,
    ADD COLUMN last_publish_error TEXT,
    ADD COLUMN last_publish_at TIMESTAMPTZ;

CREATE INDEX idx_platform_connections_status
    ON platform_connections(org_id, status)
    WHERE status IN ('needs_reconnect', 'demo_mode');
```

- [ ] **Step 2: Apply locally**

Run: `cd AgentBuffer-team && supabase db push`
Expected: `Applying migration 00009_platform_connection_status.sql ... done`

- [ ] **Step 3: Verify columns exist**

Run: `supabase db diff --schema public | grep -E "auth_method|status|last_publish_error"`
Expected: empty (no diff — migration applied cleanly).

- [ ] **Step 4: Commit**

```bash
cd "/Users/remiel/LA Hacks 2026"
git add AgentBuffer-team/supabase/migrations/00009_platform_connection_status.sql
git commit -m "feat(db): add auth_method, status, last_publish_error to platform_connections"
```

---

## Task 2: OAuth shared types

**Files:**
- Create: `web/lib/oauth/types.ts`

- [ ] **Step 1: Define platform + status enums and the provider interface**

```typescript
// web/lib/oauth/types.ts
export type Platform =
  | "linkedin"
  | "x"
  | "instagram"
  | "tiktok"
  | "youtube";

export const PLATFORMS: Platform[] = [
  "linkedin",
  "x",
  "instagram",
  "tiktok",
  "youtube",
];

export type AuthMethod = "oauth2" | "app_password";

export type ConnectionStatus =
  | "active"
  | "demo_mode"
  | "needs_reconnect"
  | "failed";

export interface OAuthStartContext {
  platform: Platform;
  orgId: string;
  brandId: string;
  redirectUri: string;
  /** PKCE verifier — providers that don't use PKCE ignore this. */
  codeVerifier?: string;
}

export interface TokenExchangeResult {
  accessToken: string;
  refreshToken?: string;
  expiresInSec?: number;
  scopes?: string[];
  /** Platform-native account identifier (e.g. LinkedIn URN, X user id). */
  accountId?: string;
  accountName?: string;
}

export interface OAuthProvider {
  platform: Platform;
  /** Build the platform's authorize URL. Returns the URL to redirect to. */
  buildAuthorizeUrl(ctx: OAuthStartContext, state: string): string;
  /** Exchange the auth code for tokens. */
  exchangeCode(
    code: string,
    ctx: OAuthStartContext
  ): Promise<TokenExchangeResult>;
  /** Initial status to assign on a fresh connection. */
  initialStatus(): ConnectionStatus;
  /** Whether this provider uses PKCE. */
  usesPkce: boolean;
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/oauth/types.ts
git commit -m "feat(oauth): add shared OAuth types and provider interface"
```

---

## Task 3: OAuth state cookie — HMAC sign/verify

**Files:**
- Create: `web/lib/oauth/state.ts`

The state cookie holds CSRF token, target platform, org_id, brand_id, and PKCE code_verifier. HMAC-SHA256 signed using `OAUTH_STATE_SECRET`. 10-minute TTL.

- [ ] **Step 1: Write the helpers**

```typescript
// web/lib/oauth/state.ts
import { cookies } from "next/headers";
import type { Platform } from "./types";

const COOKIE_NAME = "ab_oauth_state";
const TTL_MS = 10 * 60 * 1000;

export interface StatePayload {
  platform: Platform;
  orgId: string;
  brandId: string;
  csrf: string;
  codeVerifier?: string;
  expiresAt: number;
}

function getSecret(): string {
  const s = process.env.OAUTH_STATE_SECRET;
  if (!s) throw new Error("OAUTH_STATE_SECRET is not set");
  return s;
}

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  return Uint8Array.from(
    Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64")
  );
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  return b64url(sig);
}

export function newCsrf(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return b64url(buf);
}

export async function signState(
  payload: Omit<StatePayload, "expiresAt">
): Promise<string> {
  const full: StatePayload = { ...payload, expiresAt: Date.now() + TTL_MS };
  const body = b64url(new TextEncoder().encode(JSON.stringify(full)));
  const sig = await hmac(body);
  return `${body}.${sig}`;
}

export async function verifyState(token: string): Promise<StatePayload> {
  const [body, sig] = token.split(".");
  if (!body || !sig) throw new Error("Malformed state");
  const expected = await hmac(body);
  if (sig !== expected) throw new Error("Bad signature");
  const payload = JSON.parse(
    new TextDecoder().decode(fromB64url(body))
  ) as StatePayload;
  if (payload.expiresAt < Date.now()) throw new Error("State expired");
  return payload;
}

export async function setStateCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_MS / 1000,
  });
}

export async function readAndClearStateCookie(): Promise<string | null> {
  const jar = await cookies();
  const v = jar.get(COOKIE_NAME)?.value ?? null;
  if (v) jar.delete(COOKIE_NAME);
  return v;
}

// PKCE helpers (used by X)
export async function newPkcePair(): Promise<{
  verifier: string;
  challenge: string;
}> {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  const verifier = b64url(buf);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  return { verifier, challenge: b64url(digest) };
}
```

- [ ] **Step 2: Smoke-test with a Node REPL one-liner**

Run from `web/`:
```bash
OAUTH_STATE_SECRET=$(openssl rand -hex 32) node --experimental-vm-modules -e '
import("./lib/oauth/state.ts").then(async (m) => {
  const tok = await m.signState({ platform:"x", orgId:"o", brandId:"b", csrf:"c" });
  console.log(await m.verifyState(tok));
});'
```
Expected: prints `{ platform: "x", orgId: "o", brandId: "b", csrf: "c", expiresAt: <number> }`. (If TS-loader complains, skip the smoke test — verifyState will be exercised end-to-end in Task 9.)

- [ ] **Step 3: Commit**

```bash
git add web/lib/oauth/state.ts
git commit -m "feat(oauth): add HMAC-signed state cookie + PKCE helpers"
```

---

## Task 4: Connection persistence helper

**Files:**
- Create: `web/lib/oauth/connections.ts`

- [ ] **Step 1: Implement upsert/list/markStatus**

```typescript
// web/lib/oauth/connections.ts
import { createClient } from "@/lib/supabase/server";
import type {
  AuthMethod,
  ConnectionStatus,
  Platform,
  TokenExchangeResult,
} from "./types";

export interface ConnectionRow {
  id: string;
  platform: Platform;
  status: ConnectionStatus;
  auth_method: AuthMethod;
  account_id: string | null;
  account_name: string | null;
  token_expires_at: string | null;
  last_publish_error: string | null;
  connected_at: string;
}

export async function upsertConnection(args: {
  orgId: string;
  brandId: string;
  platform: Platform;
  authMethod: AuthMethod;
  status: ConnectionStatus;
  tokens: TokenExchangeResult;
}): Promise<void> {
  const sb = await createClient();
  const expiresAt = args.tokens.expiresInSec
    ? new Date(Date.now() + args.tokens.expiresInSec * 1000).toISOString()
    : null;
  const { error } = await sb.from("platform_connections").upsert(
    {
      org_id: args.orgId,
      brand_id: args.brandId,
      platform: args.platform,
      auth_method: args.authMethod,
      status: args.status,
      access_token: args.tokens.accessToken,
      refresh_token: args.tokens.refreshToken ?? null,
      token_expires_at: expiresAt,
      account_id: args.tokens.accountId ?? null,
      account_name: args.tokens.accountName ?? null,
      scopes: args.tokens.scopes ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id,brand_id,platform" }
  );
  if (error) throw new Error(`upsertConnection: ${error.message}`);
}

export async function listConnections(
  orgId: string,
  brandId: string
): Promise<ConnectionRow[]> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("platform_connections")
    .select(
      "id, platform, status, auth_method, account_id, account_name, token_expires_at, last_publish_error, connected_at"
    )
    .eq("org_id", orgId)
    .eq("brand_id", brandId)
    .order("platform");
  if (error) throw new Error(`listConnections: ${error.message}`);
  return (data ?? []) as ConnectionRow[];
}

export async function deleteConnection(args: {
  orgId: string;
  brandId: string;
  platform: Platform;
}): Promise<void> {
  const sb = await createClient();
  const { error } = await sb
    .from("platform_connections")
    .delete()
    .eq("org_id", args.orgId)
    .eq("brand_id", args.brandId)
    .eq("platform", args.platform);
  if (error) throw new Error(`deleteConnection: ${error.message}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/oauth/connections.ts
git commit -m "feat(oauth): add connection persistence helpers"
```

---

## Task 5: LinkedIn provider

**Files:**
- Create: `web/lib/oauth/providers/linkedin.ts`

LinkedIn uses standard OAuth 2.0 Authorization Code (no PKCE). Scope `w_member_social` for posting on behalf of the authorized user; `r_liteprofile` to fetch the person URN we need as `account_id`. Access token TTL 60 days.

- [ ] **Step 1: Implement provider**

```typescript
// web/lib/oauth/providers/linkedin.ts
import type {
  ConnectionStatus,
  OAuthProvider,
  OAuthStartContext,
  TokenExchangeResult,
} from "../types";

const AUTHORIZE = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN = "https://www.linkedin.com/oauth/v2/accessToken";
const ME = "https://api.linkedin.com/v2/userinfo"; // OIDC userinfo

const SCOPES = ["openid", "profile", "w_member_social"];

export const linkedinProvider: OAuthProvider = {
  platform: "linkedin",
  usesPkce: false,
  initialStatus(): ConnectionStatus {
    return "active";
  },
  buildAuthorizeUrl(ctx: OAuthStartContext, state: string): string {
    const u = new URL(AUTHORIZE);
    u.searchParams.set("response_type", "code");
    u.searchParams.set("client_id", process.env.LINKEDIN_CLIENT_ID!);
    u.searchParams.set("redirect_uri", ctx.redirectUri);
    u.searchParams.set("state", state);
    u.searchParams.set("scope", SCOPES.join(" "));
    return u.toString();
  },
  async exchangeCode(
    code: string,
    ctx: OAuthStartContext
  ): Promise<TokenExchangeResult> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: ctx.redirectUri,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    });
    const tokRes = await fetch(TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!tokRes.ok) {
      throw new Error(`LinkedIn token exchange ${tokRes.status}: ${await tokRes.text()}`);
    }
    const tok = (await tokRes.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
      scope: string;
    };

    const meRes = await fetch(ME, {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    });
    let accountId: string | undefined;
    let accountName: string | undefined;
    if (meRes.ok) {
      const me = (await meRes.json()) as { sub: string; name?: string };
      accountId = `urn:li:person:${me.sub}`;
      accountName = me.name;
    }

    return {
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token,
      expiresInSec: tok.expires_in,
      scopes: tok.scope.split(" "),
      accountId,
      accountName,
    };
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/oauth/providers/linkedin.ts
git commit -m "feat(oauth): add LinkedIn OAuth provider"
```

---

## Task 6: X provider (PKCE)

**Files:**
- Create: `web/lib/oauth/providers/x.ts`

X requires PKCE + `offline.access` for refresh tokens. Tokens are rotated on each refresh. Auth uses Basic auth (client_id:client_secret) on the token endpoint.

- [ ] **Step 1: Implement provider**

```typescript
// web/lib/oauth/providers/x.ts
import type {
  ConnectionStatus,
  OAuthProvider,
  OAuthStartContext,
  TokenExchangeResult,
} from "../types";

const AUTHORIZE = "https://x.com/i/oauth2/authorize";
const TOKEN = "https://api.x.com/2/oauth2/token";
const ME = "https://api.x.com/2/users/me";

const SCOPES = ["tweet.read", "tweet.write", "users.read", "offline.access"];

export const xProvider: OAuthProvider = {
  platform: "x",
  usesPkce: true,
  initialStatus(): ConnectionStatus {
    return "active";
  },
  buildAuthorizeUrl(ctx: OAuthStartContext, state: string): string {
    if (!ctx.codeVerifier) {
      throw new Error("X requires PKCE codeVerifier in OAuthStartContext");
    }
    // We'll compute the challenge from the verifier in the start route
    // (verifier is already kept in the state cookie); the challenge is
    // passed in via state so callers can stash it. Simpler: compute challenge here.
    // For simplicity we trust the caller to pass the challenge as `state.challenge`
    // — but to keep this provider self-contained, derive it sync in start route.
    throw new Error(
      "Call buildAuthorizeUrlWithChallenge() — X needs both verifier and challenge"
    );
  },
  async exchangeCode(
    code: string,
    ctx: OAuthStartContext
  ): Promise<TokenExchangeResult> {
    if (!ctx.codeVerifier) throw new Error("X exchangeCode requires codeVerifier");
    const basic = Buffer.from(
      `${process.env.X_OAUTH_CLIENT_ID}:${process.env.X_OAUTH_CLIENT_SECRET}`
    ).toString("base64");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: ctx.redirectUri,
      code_verifier: ctx.codeVerifier,
      client_id: process.env.X_OAUTH_CLIENT_ID!,
    });
    const tokRes = await fetch(TOKEN, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body,
    });
    if (!tokRes.ok) {
      throw new Error(`X token exchange ${tokRes.status}: ${await tokRes.text()}`);
    }
    const tok = (await tokRes.json()) as {
      token_type: string;
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope: string;
    };

    const meRes = await fetch(ME, {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    });
    let accountId: string | undefined;
    let accountName: string | undefined;
    if (meRes.ok) {
      const me = (await meRes.json()) as {
        data: { id: string; username: string };
      };
      accountId = me.data.id;
      accountName = me.data.username;
    }

    return {
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token,
      expiresInSec: tok.expires_in,
      scopes: tok.scope.split(" "),
      accountId,
      accountName,
    };
  },
};

/** Build X authorize URL with explicit code challenge (S256). */
export function buildXAuthorizeUrl(args: {
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const u = new URL(AUTHORIZE);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", process.env.X_OAUTH_CLIENT_ID!);
  u.searchParams.set("redirect_uri", args.redirectUri);
  u.searchParams.set("scope", SCOPES.join(" "));
  u.searchParams.set("state", args.state);
  u.searchParams.set("code_challenge", args.codeChallenge);
  u.searchParams.set("code_challenge_method", "S256");
  return u.toString();
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/oauth/providers/x.ts
git commit -m "feat(oauth): add X (Twitter) OAuth 2.0 provider with PKCE"
```

---

## Task 7: Instagram provider (Business Login via Meta)

**Files:**
- Create: `web/lib/oauth/providers/instagram.ts`

Instagram Business Login uses Meta's OAuth at `api.instagram.com/oauth/authorize` for the IG-specific flow (lighter than full Graph login). After getting a short-lived token we exchange it for a 60-day long-lived token. Default `initialStatus = demo_mode` until `META_APP_LIVE=true`.

- [ ] **Step 1: Implement provider**

```typescript
// web/lib/oauth/providers/instagram.ts
import type {
  ConnectionStatus,
  OAuthProvider,
  OAuthStartContext,
  TokenExchangeResult,
} from "../types";

const AUTHORIZE = "https://api.instagram.com/oauth/authorize";
const TOKEN = "https://api.instagram.com/oauth/access_token";
const LONG_LIVED =
  "https://graph.instagram.com/access_token?grant_type=ig_exchange_token";
const ME = "https://graph.instagram.com/v21.0/me?fields=id,username";

const SCOPES = ["instagram_business_basic", "instagram_business_content_publish"];

export const instagramProvider: OAuthProvider = {
  platform: "instagram",
  usesPkce: false,
  initialStatus(): ConnectionStatus {
    return process.env.META_APP_LIVE === "true" ? "active" : "demo_mode";
  },
  buildAuthorizeUrl(ctx: OAuthStartContext, state: string): string {
    const u = new URL(AUTHORIZE);
    u.searchParams.set("client_id", process.env.META_APP_ID!);
    u.searchParams.set("redirect_uri", ctx.redirectUri);
    u.searchParams.set("response_type", "code");
    u.searchParams.set("scope", SCOPES.join(","));
    u.searchParams.set("state", state);
    return u.toString();
  },
  async exchangeCode(
    code: string,
    ctx: OAuthStartContext
  ): Promise<TokenExchangeResult> {
    const form = new FormData();
    form.set("client_id", process.env.META_APP_ID!);
    form.set("client_secret", process.env.META_APP_SECRET!);
    form.set("grant_type", "authorization_code");
    form.set("redirect_uri", ctx.redirectUri);
    form.set("code", code);
    const shortRes = await fetch(TOKEN, { method: "POST", body: form });
    if (!shortRes.ok) {
      throw new Error(`IG token exchange ${shortRes.status}: ${await shortRes.text()}`);
    }
    const short = (await shortRes.json()) as {
      access_token: string;
      user_id: number;
    };

    // Swap for 60-day long-lived token
    const longUrl = new URL(LONG_LIVED);
    longUrl.searchParams.set("client_secret", process.env.META_APP_SECRET!);
    longUrl.searchParams.set("access_token", short.access_token);
    const longRes = await fetch(longUrl.toString());
    if (!longRes.ok) {
      throw new Error(`IG long-token swap ${longRes.status}: ${await longRes.text()}`);
    }
    const long = (await longRes.json()) as {
      access_token: string;
      expires_in: number;
    };

    const meRes = await fetch(ME, {
      headers: { Authorization: `Bearer ${long.access_token}` },
    });
    let username: string | undefined;
    if (meRes.ok) {
      const me = (await meRes.json()) as { id: string; username: string };
      username = me.username;
    }

    return {
      accessToken: long.access_token,
      expiresInSec: long.expires_in,
      scopes: SCOPES,
      accountId: String(short.user_id),
      accountName: username,
    };
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/oauth/providers/instagram.ts
git commit -m "feat(oauth): add Instagram Business Login provider"
```

---

## Task 8: TikTok provider

**Files:**
- Create: `web/lib/oauth/providers/tiktok.ts`

TikTok OAuth 2.0. Default `initialStatus = demo_mode` until `TIKTOK_APP_AUDITED=true` (because pre-audit posts are forced `SELF_ONLY`).

- [ ] **Step 1: Implement provider**

```typescript
// web/lib/oauth/providers/tiktok.ts
import type {
  ConnectionStatus,
  OAuthProvider,
  OAuthStartContext,
  TokenExchangeResult,
} from "../types";

const AUTHORIZE = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN = "https://open.tiktokapis.com/v2/oauth/token/";
const USER_INFO =
  "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,display_name";

const SCOPES = ["user.info.basic", "video.publish", "video.upload"];

export const tiktokProvider: OAuthProvider = {
  platform: "tiktok",
  usesPkce: false,
  initialStatus(): ConnectionStatus {
    return process.env.TIKTOK_APP_AUDITED === "true" ? "active" : "demo_mode";
  },
  buildAuthorizeUrl(ctx: OAuthStartContext, state: string): string {
    const u = new URL(AUTHORIZE);
    u.searchParams.set("client_key", process.env.TIKTOK_CLIENT_KEY!);
    u.searchParams.set("response_type", "code");
    u.searchParams.set("scope", SCOPES.join(","));
    u.searchParams.set("redirect_uri", ctx.redirectUri);
    u.searchParams.set("state", state);
    return u.toString();
  },
  async exchangeCode(
    code: string,
    ctx: OAuthStartContext
  ): Promise<TokenExchangeResult> {
    const body = new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: ctx.redirectUri,
    });
    const tokRes = await fetch(TOKEN, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body,
    });
    if (!tokRes.ok) {
      throw new Error(`TikTok token exchange ${tokRes.status}: ${await tokRes.text()}`);
    }
    const tok = (await tokRes.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      open_id: string;
      scope: string;
    };

    const userRes = await fetch(USER_INFO, {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    });
    let displayName: string | undefined;
    if (userRes.ok) {
      const u = (await userRes.json()) as {
        data?: { user?: { display_name?: string } };
      };
      displayName = u.data?.user?.display_name;
    }

    return {
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token,
      expiresInSec: tok.expires_in,
      scopes: tok.scope.split(","),
      accountId: tok.open_id,
      accountName: displayName,
    };
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/oauth/providers/tiktok.ts
git commit -m "feat(oauth): add TikTok OAuth provider (defaults to demo_mode)"
```

---

## Task 9: YouTube provider (Google OAuth)

**Files:**
- Create: `web/lib/oauth/providers/youtube.ts`

Standard Google OAuth 2.0. `youtube.upload` is a sensitive scope, so `initialStatus = demo_mode` until `GOOGLE_APP_VERIFIED=true`. We request `access_type=offline&prompt=consent` to guarantee a refresh token.

- [ ] **Step 1: Implement provider**

```typescript
// web/lib/oauth/providers/youtube.ts
import type {
  ConnectionStatus,
  OAuthProvider,
  OAuthStartContext,
  TokenExchangeResult,
} from "../types";

const AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const CHANNEL =
  "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true";

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
];

export const youtubeProvider: OAuthProvider = {
  platform: "youtube",
  usesPkce: false,
  initialStatus(): ConnectionStatus {
    return process.env.GOOGLE_APP_VERIFIED === "true" ? "active" : "demo_mode";
  },
  buildAuthorizeUrl(ctx: OAuthStartContext, state: string): string {
    const u = new URL(AUTHORIZE);
    u.searchParams.set("client_id", process.env.GOOGLE_OAUTH_CLIENT_ID!);
    u.searchParams.set("redirect_uri", ctx.redirectUri);
    u.searchParams.set("response_type", "code");
    u.searchParams.set("scope", SCOPES.join(" "));
    u.searchParams.set("access_type", "offline");
    u.searchParams.set("prompt", "consent");
    u.searchParams.set("state", state);
    return u.toString();
  },
  async exchangeCode(
    code: string,
    ctx: OAuthStartContext
  ): Promise<TokenExchangeResult> {
    const body = new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      redirect_uri: ctx.redirectUri,
      grant_type: "authorization_code",
    });
    const tokRes = await fetch(TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!tokRes.ok) {
      throw new Error(`Google token exchange ${tokRes.status}: ${await tokRes.text()}`);
    }
    const tok = (await tokRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope: string;
    };

    const chRes = await fetch(CHANNEL, {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    });
    let channelId: string | undefined;
    let channelTitle: string | undefined;
    if (chRes.ok) {
      const ch = (await chRes.json()) as {
        items?: Array<{ id: string; snippet: { title: string } }>;
      };
      channelId = ch.items?.[0]?.id;
      channelTitle = ch.items?.[0]?.snippet.title;
    }

    return {
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token,
      expiresInSec: tok.expires_in,
      scopes: tok.scope.split(" "),
      accountId: channelId,
      accountName: channelTitle,
    };
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/oauth/providers/youtube.ts
git commit -m "feat(oauth): add YouTube (Google) OAuth provider"
```

---

## Task 10: Provider registry

**Files:**
- Create: `web/lib/oauth/registry.ts`

- [ ] **Step 1: Wire all providers**

```typescript
// web/lib/oauth/registry.ts
import { instagramProvider } from "./providers/instagram";
import { linkedinProvider } from "./providers/linkedin";
import { tiktokProvider } from "./providers/tiktok";
import { xProvider } from "./providers/x";
import { youtubeProvider } from "./providers/youtube";
import type { OAuthProvider, Platform } from "./types";

const REGISTRY: Record<Platform, OAuthProvider> = {
  linkedin: linkedinProvider,
  x: xProvider,
  instagram: instagramProvider,
  tiktok: tiktokProvider,
  youtube: youtubeProvider,
};

export function getProvider(platform: Platform): OAuthProvider {
  const p = REGISTRY[platform];
  if (!p) throw new Error(`Unknown platform: ${platform}`);
  return p;
}

export function isPlatform(value: string): value is Platform {
  return value in REGISTRY;
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/oauth/registry.ts
git commit -m "feat(oauth): add provider registry"
```

---

## Task 11: Start route — `/api/connect/[platform]/start`

**Files:**
- Create: `web/app/api/connect/[platform]/start/route.ts`

Reads current org_id + brand_id, generates state (+PKCE for X), sets the state cookie, redirects to the platform's authorize URL.

- [ ] **Step 1: Implement the start route**

```typescript
// web/app/api/connect/[platform]/start/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/current-org";
import { getProvider, isPlatform } from "@/lib/oauth/registry";
import {
  newCsrf,
  newPkcePair,
  setStateCookie,
  signState,
} from "@/lib/oauth/state";
import { buildXAuthorizeUrl } from "@/lib/oauth/providers/x";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  if (!isPlatform(platform)) {
    return NextResponse.json({ error: "unknown_platform" }, { status: 400 });
  }

  const orgId = await getCurrentOrgId();
  if (!orgId) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const sb = await createClient();
  const { data: brand } = await sb
    .from("brands")
    .select("id")
    .eq("org_id", orgId)
    .limit(1)
    .maybeSingle();
  if (!brand) {
    return NextResponse.redirect(new URL("/dashboard/onboard", req.url));
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL!;
  const redirectUri = `${origin}/api/connect/${platform}/callback`;
  const csrf = newCsrf();

  const provider = getProvider(platform);
  let codeVerifier: string | undefined;
  let codeChallenge: string | undefined;
  if (provider.usesPkce) {
    const pair = await newPkcePair();
    codeVerifier = pair.verifier;
    codeChallenge = pair.challenge;
  }

  const stateToken = await signState({
    platform,
    orgId,
    brandId: brand.id as string,
    csrf,
    codeVerifier,
  });
  await setStateCookie(stateToken);

  const authorizeUrl =
    platform === "x"
      ? buildXAuthorizeUrl({
          redirectUri,
          state: stateToken,
          codeChallenge: codeChallenge!,
        })
      : provider.buildAuthorizeUrl(
          { platform, orgId, brandId: brand.id as string, redirectUri },
          stateToken
        );

  return NextResponse.redirect(authorizeUrl);
}
```

- [ ] **Step 2: Manual test (LinkedIn, before callback exists — expect 4xx after redirect)**

Run: `cd web && pnpm dev`
Visit: `http://localhost:3000/api/connect/linkedin/start`
Expected: 302 to `linkedin.com/oauth/v2/authorization?...`. Sign in. After consent, LinkedIn redirects to `/api/connect/linkedin/callback?code=...` which 404s — that's expected (callback not built yet).

- [ ] **Step 3: Commit**

```bash
git add "web/app/api/connect/[platform]/start/route.ts"
git commit -m "feat(oauth): add /api/connect/[platform]/start route"
```

---

## Task 12: Callback route — `/api/connect/[platform]/callback`

**Files:**
- Create: `web/app/api/connect/[platform]/callback/route.ts`

- [ ] **Step 1: Implement the callback route**

```typescript
// web/app/api/connect/[platform]/callback/route.ts
import { NextResponse } from "next/server";
import { upsertConnection } from "@/lib/oauth/connections";
import { getProvider, isPlatform } from "@/lib/oauth/registry";
import { readAndClearStateCookie, verifyState } from "@/lib/oauth/state";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  if (!isPlatform(platform)) {
    return NextResponse.json({ error: "unknown_platform" }, { status: 400 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");
  const errorDesc = url.searchParams.get("error_description") ?? "";

  if (errorParam) {
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings/connections?error=${encodeURIComponent(`${errorParam}: ${errorDesc}`)}`,
        req.url
      )
    );
  }
  if (!code || !stateParam) {
    return NextResponse.json(
      { error: "missing_code_or_state" },
      { status: 400 }
    );
  }

  const cookieToken = await readAndClearStateCookie();
  if (!cookieToken || cookieToken !== stateParam) {
    return NextResponse.json({ error: "state_mismatch" }, { status: 400 });
  }

  let payload;
  try {
    payload = await verifyState(stateParam);
  } catch (e) {
    return NextResponse.json(
      { error: "state_invalid", detail: (e as Error).message },
      { status: 400 }
    );
  }
  if (payload.platform !== platform) {
    return NextResponse.json({ error: "state_platform_mismatch" }, { status: 400 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL!;
  const redirectUri = `${origin}/api/connect/${platform}/callback`;
  const provider = getProvider(platform);

  let tokens;
  try {
    tokens = await provider.exchangeCode(code, {
      platform,
      orgId: payload.orgId,
      brandId: payload.brandId,
      redirectUri,
      codeVerifier: payload.codeVerifier,
    });
  } catch (e) {
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings/connections?error=${encodeURIComponent(
          `Token exchange failed: ${(e as Error).message}`
        )}`,
        req.url
      )
    );
  }

  await upsertConnection({
    orgId: payload.orgId,
    brandId: payload.brandId,
    platform,
    authMethod: "oauth2",
    status: provider.initialStatus(),
    tokens,
  });

  return NextResponse.redirect(
    new URL(
      `/dashboard/settings/connections?connected=${platform}`,
      req.url
    )
  );
}
```

- [ ] **Step 2: Manual test, end-to-end (LinkedIn first)**

Pre-req: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `OAUTH_STATE_SECRET`, `NEXT_PUBLIC_SITE_URL` set in `web/.env.local`. Redirect URI registered in LinkedIn dev console.

Run: `pnpm dev` (in `web/`)
Visit: `http://localhost:3000/api/connect/linkedin/start` (signed in)
Walk through LinkedIn consent.
Expected: lands on `/dashboard/settings/connections?connected=linkedin` (page may 404 until Task 14 — that's OK, the connection row should be inserted). Verify in Supabase:

```sql
SELECT platform, status, account_name, scopes, token_expires_at
FROM platform_connections
WHERE org_id = '<your_org_id>';
```

Expected: one row with `platform='linkedin'`, `status='active'`, populated `access_token` and `account_id` (LinkedIn URN).

- [ ] **Step 3: Commit**

```bash
git add "web/app/api/connect/[platform]/callback/route.ts"
git commit -m "feat(oauth): add /api/connect/[platform]/callback route"
```

---

## Task 13: Server actions — list/disconnect

**Files:**
- Create: `web/actions/connections.ts`

- [ ] **Step 1: Implement actions**

```typescript
// web/actions/connections.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/current-org";
import {
  deleteConnection,
  listConnections,
  type ConnectionRow,
} from "@/lib/oauth/connections";
import type { Platform } from "@/lib/oauth/types";

async function requireBrand(): Promise<{ orgId: string; brandId: string }> {
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("Not signed in");
  const sb = await createClient();
  const { data, error } = await sb
    .from("brands")
    .select("id")
    .eq("org_id", orgId)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No brand for org — finish onboarding first");
  return { orgId, brandId: data.id as string };
}

export async function listConnectionsAction(): Promise<ConnectionRow[]> {
  const { orgId, brandId } = await requireBrand();
  return listConnections(orgId, brandId);
}

export async function disconnectAction(platform: Platform): Promise<void> {
  const { orgId, brandId } = await requireBrand();
  await deleteConnection({ orgId, brandId, platform });
  revalidatePath("/dashboard/settings/connections");
}
```

- [ ] **Step 2: Commit**

```bash
git add web/actions/connections.ts
git commit -m "feat(actions): add list/disconnect connections server actions"
```

---

## Task 14: Settings → Connections page

**Files:**
- Create: `web/app/dashboard/settings/connections/page.tsx`
- Create: `web/components/settings/connections-list.tsx`

- [ ] **Step 1: Server page that fetches connections + renders the client list**

```typescript
// web/app/dashboard/settings/connections/page.tsx
import { listConnectionsAction } from "@/actions/connections";
import { ConnectionsList } from "@/components/settings/connections-list";

export const dynamic = "force-dynamic";

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const params = await searchParams;
  const connections = await listConnectionsAction();
  return (
    <div className="max-w-[760px] mx-auto p-6 flex flex-col gap-4">
      <div>
        <h1 className="font-serif font-semibold text-[22px] text-ink leading-tight">
          Connected channels
        </h1>
        <p className="text-[12.5px] text-ink-3 mt-1">
          Channels your brand agents are allowed to publish to. None are
          required — connect only what you want the agents to post on.
        </p>
      </div>
      <ConnectionsList
        connections={connections}
        flashConnected={params.connected ?? null}
        flashError={params.error ?? null}
      />
    </div>
  );
}
```

- [ ] **Step 2: Client list component with Connect/Disconnect buttons + status badges**

```typescript
// web/components/settings/connections-list.tsx
"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChannelIcon } from "@/components/ui/channel-icon";
import { disconnectAction } from "@/actions/connections";
import type { ConnectionRow } from "@/lib/oauth/connections";
import { PLATFORMS, type Platform } from "@/lib/oauth/types";

const PLATFORM_LABEL: Record<Platform, string> = {
  linkedin: "LinkedIn",
  x: "X",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

function statusBadge(status: ConnectionRow["status"] | null) {
  if (status === "active")
    return <Badge variant="success">Connected</Badge>;
  if (status === "demo_mode")
    return <Badge variant="warning">Demo mode</Badge>;
  if (status === "needs_reconnect")
    return <Badge variant="danger">Reconnect</Badge>;
  if (status === "failed") return <Badge variant="danger">Failed</Badge>;
  return null;
}

export function ConnectionsList({
  connections,
  flashConnected,
  flashError,
}: {
  connections: ConnectionRow[];
  flashConnected: string | null;
  flashError: string | null;
}) {
  const [pending, start] = useTransition();
  const byPlatform = new Map(connections.map((c) => [c.platform, c]));

  if (flashConnected) toast.success(`${flashConnected} connected.`);
  if (flashError) toast.error(flashError);

  function handleDisconnect(p: Platform) {
    start(async () => {
      try {
        await disconnectAction(p);
        toast.success(`${PLATFORM_LABEL[p]} disconnected.`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Disconnect failed");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {PLATFORMS.map((p) => {
        const row = byPlatform.get(p) ?? null;
        return (
          <Card
            key={p}
            className="p-4 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <ChannelIcon channel={p} />
              <div className="min-w-0">
                <div className="font-mono text-[12px] uppercase tracking-wider text-ink">
                  {PLATFORM_LABEL[p]}
                </div>
                <div className="text-[11.5px] text-ink-3 truncate">
                  {row?.account_name ?? "Not connected"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {statusBadge(row?.status ?? null)}
              {row ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisconnect(p)}
                    disabled={pending}
                  >
                    Disconnect
                  </Button>
                  <a href={`/api/connect/${p}/start`}>
                    <Button variant="outline" size="sm">
                      Reconnect
                    </Button>
                  </a>
                </>
              ) : (
                <a href={`/api/connect/${p}/start`}>
                  <Button variant="primary" size="sm">
                    Connect
                  </Button>
                </a>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Verify Badge variants exist**

Run: `grep -E "success|warning|danger" web/components/ui/badge.tsx`
Expected: variants found. If not, edit `web/components/ui/badge.tsx` to add them (use Tailwind `bg-emerald-100 text-emerald-800` for success, `bg-amber-100 text-amber-800` for warning, `bg-red-100 text-red-800` for danger).

- [ ] **Step 4: Manual test**

`pnpm dev`, sign in, visit `http://localhost:3000/dashboard/settings/connections`. Expected: 5 cards (one per platform), all "Not connected." Click LinkedIn Connect → run through OAuth → return to page with "Connected" badge + account name.

- [ ] **Step 5: Commit**

```bash
git add web/app/dashboard/settings/connections/page.tsx web/components/settings/connections-list.tsx
git commit -m "feat(settings): add Connections page with Connect/Disconnect/Reconnect"
```

---

## Task 15: Onboarding step — add Connect buttons next to URL inputs

**Files:**
- Modify: `web/components/onboarding/connect-socials-step.tsx`

The URL inputs stay (they drive *voice extraction*, not publishing). Connect buttons are additive.

- [ ] **Step 1: Replace the file**

```typescript
// web/components/onboarding/connect-socials-step.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2 } from "lucide-react";
import type { BrandFormData } from "./onboarding-wizard";
import { listConnectionsAction } from "@/actions/connections";
import type { ConnectionRow } from "@/lib/oauth/connections";
import { PLATFORMS, type Platform } from "@/lib/oauth/types";

interface Props {
  form: BrandFormData;
  onChange: (updates: Partial<BrandFormData>) => void;
  onBack: () => void;
  onExtract: () => void;
  extracting: boolean;
}

const PLATFORM_LABEL: Record<Platform, string> = {
  linkedin: "LinkedIn",
  x: "X",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

function statusBadge(status: ConnectionRow["status"] | null) {
  if (status === "active") return <Badge variant="success">Connected</Badge>;
  if (status === "demo_mode") return <Badge variant="warning">Demo mode</Badge>;
  if (status === "needs_reconnect")
    return <Badge variant="danger">Reconnect</Badge>;
  return null;
}

export function ConnectSocialsStep({
  form,
  onChange,
  onBack,
  onExtract,
  extracting,
}: Props) {
  const [connections, setConnections] = useState<ConnectionRow[]>([]);

  useEffect(() => {
    listConnectionsAction()
      .then(setConnections)
      .catch(() => setConnections([]));
  }, []);

  const byPlatform = new Map(connections.map((c) => [c.platform, c]));

  function ConnectRow({
    platform,
    label,
    placeholder,
    value,
    onValue,
  }: {
    platform: Platform;
    label: string;
    placeholder: string;
    value: string;
    onValue: (v: string) => void;
  }) {
    const conn = byPlatform.get(platform) ?? null;
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <Field label={`${label} URL (for voice extraction)`}>
            <Input
              placeholder={placeholder}
              value={value}
              onChange={(e) => onValue(e.target.value)}
            />
          </Field>
        </div>
        <div className="flex items-center gap-2">
          {statusBadge(conn?.status ?? null)}
          {conn ? (
            <span className="text-[11px] text-ink-3 font-mono truncate">
              {conn.account_name ?? conn.account_id}
            </span>
          ) : (
            <a href={`/api/connect/${platform}/start`}>
              <Button variant="outline" size="sm" type="button">
                Connect {PLATFORM_LABEL[platform]}
              </Button>
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="font-serif font-semibold text-[20px] text-ink leading-tight">
          Connect socials & extract
        </h2>
        <p className="text-[12.5px] text-ink-3 mt-1">
          Link the channels the publisher should post to (none required). URLs
          are used to extract brand voice from past posts.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ConnectRow
          platform="linkedin"
          label="LinkedIn"
          placeholder="https://linkedin.com/company/lumen-coffee"
          value={form.linkedin_url}
          onValue={(v) => onChange({ linkedin_url: v })}
        />
        <ConnectRow
          platform="x"
          label="X (Twitter)"
          placeholder="https://x.com/lumencoffee"
          value={form.x_url}
          onValue={(v) => onChange({ x_url: v })}
        />
        <ConnectRow
          platform="instagram"
          label="Instagram"
          placeholder="https://instagram.com/lumencoffee"
          value={form.instagram_url}
          onValue={(v) => onChange({ instagram_url: v })}
        />
        <ConnectRow
          platform="tiktok"
          label="TikTok"
          placeholder="https://tiktok.com/@lumencoffee"
          value={form.tiktok_url}
          onValue={(v) => onChange({ tiktok_url: v })}
        />
        {/* YouTube URL is not in BrandFormData today — Connect button only */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            {statusBadge(byPlatform.get("youtube")?.status ?? null)}
            {byPlatform.get("youtube") ? (
              <span className="text-[11px] text-ink-3 font-mono truncate">
                {byPlatform.get("youtube")!.account_name ??
                  byPlatform.get("youtube")!.account_id}
              </span>
            ) : (
              <a href={`/api/connect/youtube/start`}>
                <Button variant="outline" size="sm" type="button">
                  Connect YouTube
                </Button>
              </a>
            )}
          </div>
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack} disabled={extracting}>
            ← Back
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={onExtract}
            disabled={extracting}
          >
            {extracting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Extracting…
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Extract brand kit with AI
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Manual test**

`pnpm dev` → sign up fresh org → walk to step 3. Expected: each platform row shows "Not connected" + a "Connect <Platform>" button next to the URL input. Click LinkedIn → OAuth → return to onboarding (URL routing back to onboarding is best-effort; user can navigate back manually) → reload step 3 → LinkedIn now shows "Connected" badge.

- [ ] **Step 3: Commit**

```bash
git add web/components/onboarding/connect-socials-step.tsx
git commit -m "feat(onboarding): add Connect buttons next to social URL inputs"
```

---

## Task 16: Publisher — read `status`, mark `needs_reconnect` on 401/403

**Files:**
- Modify: `AgentBuffer-team/services/shared/db.py` — add `update_platform_connection_status`
- Modify: `AgentBuffer-team/services/publisher/agent.py` — branch on status, handle 401/403
- Test: `AgentBuffer-team/services/publisher/tests/test_publisher.py`

- [ ] **Step 1: Add the db helper**

In `services/shared/db.py`, after `get_platform_connection`, append:

```python
def update_platform_connection_status(
    brand_id: str,
    platform: str,
    status: str,
    last_error: str | None = None,
) -> None:
    """Update connection status (e.g. mark needs_reconnect after 401)."""
    sb = get_supabase()
    update: dict = {"status": status, "updated_at": _now_iso()}
    if last_error is not None:
        update["last_publish_error"] = last_error
    sb.table("platform_connections").update(update).eq("brand_id", brand_id).eq(
        "platform", platform
    ).execute()
```

- [ ] **Step 2: Branch on `status` in `publish_one`**

In `services/publisher/agent.py`, replace the body of `publish_one` (currently around line 122) with:

```python
async def publish_one(slot: ContentSlot, brand_id: str) -> PublishResult:
    """Publish a single approved slot for a cognition agent.

    - status='needs_reconnect' or 'failed' → skip without calling adapter.
    - status='demo_mode' → publish anyway, downstream UI will surface badge.
    - 401/403 from adapter → flip status to needs_reconnect.
    """
    idempotency_key = f"pub-{slot.slot_id}-{uuid4().hex[:6]}"

    try:
        from services.shared.db import (
            get_platform_connection,
            update_platform_connection_status,
        )

        conn = get_platform_connection(brand_id, slot.platform.value)
    except Exception as exc:
        logger.warning(
            "platform_connections lookup failed for brand=%s platform=%s: %s — using env",
            brand_id, slot.platform.value, exc,
        )
        conn = None

    if conn:
        status = conn.get("status", "active")
        if status in ("needs_reconnect", "failed"):
            return PublishResult(
                slot_id=slot.slot_id,
                platform=slot.platform,
                success=False,
                error=f"connection {status} — user must reconnect",
                idempotency_key=idempotency_key,
            )
        _apply_connection_to_adapter(slot.platform.value, conn)

    adapter = get_adapter(slot.platform)
    result = await adapter.publish(slot, idempotency_key)

    # Buffer-style: flip to needs_reconnect on auth failures
    if (
        conn is not None
        and not result.success
        and result.error
        and ("401" in result.error or "403" in result.error)
    ):
        try:
            update_platform_connection_status(
                brand_id,
                slot.platform.value,
                "needs_reconnect",
                last_error=result.error[:500],
            )
        except Exception as exc:
            logger.warning("Failed to mark needs_reconnect: %s", exc)

    return result
```

- [ ] **Step 3: Add pytest tests**

Append to `services/publisher/tests/test_publisher.py`:

```python
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from services.publisher.agent import publish_one
from services.shared.models import ContentSlot, Platform, PublishResult


def _slot() -> ContentSlot:
    return ContentSlot(
        slot_id="s1",
        platform=Platform.LINKEDIN,
        caption="hi",
        media_urls=[],
        scheduled_for="2026-04-26T12:00:00Z",
    )


@pytest.mark.asyncio
async def test_publish_one_skips_when_needs_reconnect():
    with patch("services.shared.db.get_platform_connection") as gpc, \
         patch("services.publisher.agent.get_adapter") as ga:
        gpc.return_value = {"status": "needs_reconnect", "access_token": "x"}
        result = await publish_one(_slot(), brand_id="b1")
        assert result.success is False
        assert "needs_reconnect" in (result.error or "")
        ga.assert_not_called()


@pytest.mark.asyncio
async def test_publish_one_marks_needs_reconnect_on_401():
    with patch("services.shared.db.get_platform_connection") as gpc, \
         patch("services.shared.db.update_platform_connection_status") as ups, \
         patch("services.publisher.agent.get_adapter") as ga:
        gpc.return_value = {"status": "active", "access_token": "x"}
        adapter = MagicMock()
        adapter.publish = AsyncMock(
            return_value=PublishResult(
                slot_id="s1",
                platform=Platform.LINKEDIN,
                success=False,
                error="LinkedIn API error: 401 — token expired",
                idempotency_key="k",
            )
        )
        ga.return_value = adapter
        await publish_one(_slot(), brand_id="b1")
        ups.assert_called_once()
        args, kwargs = ups.call_args
        assert args[0] == "b1"
        assert args[1] == "linkedin"
        assert args[2] == "needs_reconnect"
```

- [ ] **Step 4: Run tests**

Run: `cd AgentBuffer-team && uv run pytest services/publisher/tests/test_publisher.py -v`
Expected: both new tests PASS, plus the pre-existing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add AgentBuffer-team/services/shared/db.py AgentBuffer-team/services/publisher/agent.py AgentBuffer-team/services/publisher/tests/test_publisher.py
git commit -m "feat(publisher): honor connection status + flip to needs_reconnect on 401"
```

---

## Task 17: Update CLAUDE.md decisions log

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Append three rows to the decisions table**

Edit the table under "## Decisions log" — add these rows after the 2026-04-24 rows:

```
| 2026-04-25 | Direct platform OAuth in `platform_connections`, dropped Ayrshare | Hackathon-tractable for X/LinkedIn; Ayrshare's app-review constraints didn't justify the dependency |
| 2026-04-25 | 5 connectable platforms (LinkedIn, X, IG, TikTok, YouTube), all optional, none required to onboard | "Functionable but not required" — IG/TikTok/YouTube land in `demo_mode` until app review/audit clears |
| 2026-04-25 | Buffer-style passive "reconnect" pill on 401/403, no background refresh worker | Cuts code surface; refresh-on-failure is sufficient for hackathon scope |
```

Also update the "Stack (locked)" row for **Publishing** from:

```
| Publishing | Ayrshare → LinkedIn + X (live), IG ("queued for review" pill) |
```

to:

```
| Publishing | Direct platform OAuth in `platform_connections` → LinkedIn + X (live), IG/TikTok/YouTube (demo_mode pill) |
```

And remove `Ayrshare` from the "Banned / explicitly NOT building" sponsor section if it's listed there (it currently isn't — Ayrshare is in the *Sponsors targeted* section; remove it from there since we no longer use it).

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update decisions log for direct OAuth + 5-platform connect flow"
```

---

## Self-Review Checklist (post-write)

- [x] **Spec coverage:** All 5 platforms have a provider task (5–9). Schema, state, persistence, routes, UI (settings + onboarding), publisher integration, and decisions log all have tasks.
- [x] **Placeholder scan:** No "TBD", "implement later", or unspecified validation. Each step has runnable code.
- [x] **Type consistency:** `Platform`, `ConnectionRow`, `OAuthProvider`, `TokenExchangeResult`, `ConnectionStatus` names are identical across Tasks 2, 4, 13, and 14. The web `Platform` type aligns with the Postgres `platform` CHECK constraint values from migration 00005.
- [x] **TDD coverage where feasible:** Python publisher changes (Task 16) have pytest tests; OAuth flows (Tasks 5–12) are integration-tested manually because the web app has no JS test runner — adding one is out of scope for the hackathon.
