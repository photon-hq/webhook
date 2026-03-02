# Photon Webhook

Webhook bridge for [Advanced iMessage Kit](https://photon.codes). Connect your iMessage server to any HTTP endpoint and receive real-time events signed with HMAC-SHA256.

## How it works

```
iMessage server
      │
      │  WebSocket (Advanced iMessage Kit SDK)
      ▼
  API service  ──── PostgreSQL LISTEN/NOTIFY ────  Web UI
      │                                            (configure servers)
      │  POST  { event, data }
      │  X-Photon-Signature: v0=<hmac>
      │  X-Photon-Timestamp: <unix>
      ▼
Your webhook endpoint
```

1. **Configure** — Enter your iMessage server URL, API key, and webhook URL in the web UI. A signing secret is generated and the config is saved to PostgreSQL.
2. **Connect** — The API service picks up the new config via `LISTEN/NOTIFY` and opens a WebSocket connection to your iMessage server using the SDK.
3. **Forward** — Every iMessage event is signed with HMAC-SHA256 and POSTed to your webhook URL.

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.1
- PostgreSQL 15+
- An [Advanced iMessage Kit](https://photon.codes) server URL and API key

## Setup

```sh
bun install
```

Copy the environment file and fill in your database URL:

```sh
cp .env.example .env
```

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/webhook
```

Run migrations:

```sh
bun --filter @turbobun/db run db:migrate
```

## Development

```sh
# Run both apps in parallel
bun dev

# Or individually
bun --filter ./apps/web dev   # Next.js UI  → http://localhost:3000
bun --filter ./apps/api dev   # API service (background, no HTTP port)
```

## Configuration

Open `http://localhost:3000` and fill in:

| Field | Description |
|---|---|
| **Server URL** | Your iMessage server base URL |
| **API Key** | API key for that server |
| **Webhook URL** | Your endpoint that will receive events |

The form verifies the server URL and API key are valid before saving. On success you'll receive a **signing secret** — store it securely, you'll need it to verify incoming requests.

Updating an existing server URL regenerates the signing secret.

## Webhook payload

Your endpoint receives a `POST` for every iMessage event:

```
POST https://your-endpoint.com/webhook
Content-Type: application/json
X-Photon-Signature: v0=<64-char hex>
X-Photon-Timestamp: <unix seconds>
```

```ts
import type { MessageResponse } from "@photon-ai/advanced-imessage-kit";

interface WebhookPayload {
  event:
    | "new-message"               | "updated-message"
    | "message-send-error"        | "chat-read-status-changed"
    | "group-name-change"         | "participant-added"
    | "participant-removed"       | "participant-left"
    | "group-icon-changed"        | "group-icon-removed"
    | "typing-indicator"          | "new-server"
    | "server-update"             | "server-update-downloading"
    | "server-update-installing"  | "ft-call-status-changed"
    | "new-findmy-location"
    | "scheduled-message-created" | "scheduled-message-updated"
    | "scheduled-message-deleted" | "scheduled-message-sent"
    | "scheduled-message-error";
  data: MessageResponse;
}
```

## Verifying signatures

Always verify the signature **before** processing the event. Use the raw request body string — do not parse then re-stringify.

The signature base string is: `v0:{X-Photon-Timestamp}:{raw body}`

**TypeScript**

```ts
import { createHmac } from "node:crypto";

function verifyPhotonWebhook(
  rawBody: string,
  signingSecret: string,
  signature: string,   // X-Photon-Signature
  timestamp: string,   // X-Photon-Timestamp
): boolean {
  const sigBase = `v0:${timestamp}:${rawBody}`;
  const expected = `v0=${createHmac("sha256", signingSecret).update(sigBase).digest("hex")}`;
  return expected === signature;
}
```

**Python**

```python
import hashlib, hmac

def verify_photon_webhook(raw_body, signing_secret, signature, timestamp):
    sig_base = f"v0:{timestamp}:{raw_body}"
    expected = "v0=" + hmac.new(
        signing_secret.encode(), sig_base.encode(), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

**Go**

```go
func verifyPhotonWebhook(rawBody, signingSecret, signature, timestamp string) bool {
    sigBase := fmt.Sprintf("v0:%s:%s", timestamp, rawBody)
    mac := hmac.New(sha256.New, []byte(signingSecret))
    mac.Write([]byte(sigBase))
    expected := "v0=" + hex.EncodeToString(mac.Sum(nil))
    return hmac.Equal([]byte(expected), []byte(signature))
}
```

**Rust**

```rust
fn verify_photon_webhook(raw_body: &str, signing_secret: &str, signature: &str, timestamp: &str) -> bool {
    let sig_base = format!("v0:{}:{}", timestamp, raw_body);
    let mut mac = Hmac::<Sha256>::new_from_slice(signing_secret.as_bytes()).unwrap();
    mac.update(sig_base.as_bytes());
    format!("v0={}", hex::encode(mac.finalize().into_bytes())) == signature
}
```

## Deployment

The project includes a `docker-compose.yml` for production. It expects an external Docker network named `dokploy-network` (created by [Dokploy](https://dokploy.com)):

```sh
docker network create dokploy-network
docker-compose up --build
```

The web container runs database migrations automatically on startup.

## Project structure

```
apps/
  api/          Bun service — SDK connections + webhook forwarding
  web/          Next.js UI — server configuration form
packages/
  db/           Drizzle schema, migrations, shared db client
  typescript-config/  Shared tsconfig base
```

## Code quality

```sh
bun x ultracite fix    # format + lint (auto-fix)
bun x ultracite check  # check only
```
