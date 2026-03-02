import { codeToHtml } from "shiki";
import { LANGUAGES, type Language } from "./languages";
import { WebhookConfig } from "./webhook-config";

const SNIPPETS: Record<Language, string> = {
  typescript: `import { createHmac } from "node:crypto";

// Use the raw request body string — do NOT parse then re-stringify.
function verifyPhotonWebhook(
  rawBody: string,
  signingSecret: string,
  signature: string,  // X-Photon-Signature header
  timestamp: string,  // X-Photon-Timestamp header
): boolean {
  const sigBase = \`v0:\${timestamp}:\${rawBody}\`;
  const expected = \`v0=\${createHmac("sha256", signingSecret)
    .update(sigBase)
    .digest("hex")}\`;
  return expected === signature;
}

// Express example
app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const valid = verifyPhotonWebhook(
    req.body.toString(),
    process.env.PHOTON_SIGNING_SECRET,
    req.headers["x-photon-signature"] as string,
    req.headers["x-photon-timestamp"] as string,
  );
  if (!valid) return res.status(401).send("Unauthorized");
  const { event, data } = JSON.parse(req.body.toString());
  // handle event...
  res.sendStatus(200);
});`,

  python: `import hashlib
import hmac
import os

from fastapi import FastAPI, Header, HTTPException, Request

app = FastAPI()

def verify_photon_webhook(
    raw_body: str,
    signing_secret: str,
    signature: str,   # X-Photon-Signature header
    timestamp: str,   # X-Photon-Timestamp header
) -> bool:
    sig_base = f"v0:{timestamp}:{raw_body}"
    expected = "v0=" + hmac.new(
        signing_secret.encode(),
        sig_base.encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)

@app.post("/webhook")
async def webhook(
    request: Request,
    x_photon_signature: str = Header(...),
    x_photon_timestamp: str = Header(...),
):
    raw_body = (await request.body()).decode()
    if not verify_photon_webhook(
        raw_body,
        os.environ["PHOTON_SIGNING_SECRET"],
        x_photon_signature,
        x_photon_timestamp,
    ):
        raise HTTPException(status_code=401, detail="Unauthorized")
    payload = await request.json()
    event, data = payload["event"], payload["data"]
    # handle event...
    return {"ok": True}`,

  rust: `use axum::{
    body::Bytes,
    extract::State,
    http::{HeaderMap, StatusCode},
    Router,
};
use hmac::{Hmac, Mac};
use sha2::Sha256;

fn verify_photon_webhook(
    raw_body: &str,
    signing_secret: &str,
    signature: &str,  // X-Photon-Signature header
    timestamp: &str,  // X-Photon-Timestamp header
) -> bool {
    let sig_base = format!("v0:{}:{}", timestamp, raw_body);
    let mut mac = Hmac::<Sha256>::new_from_slice(signing_secret.as_bytes())
        .expect("HMAC accepts any key size");
    mac.update(sig_base.as_bytes());
    let expected = format!("v0={}", hex::encode(mac.finalize().into_bytes()));
    expected == signature
}

// Axum handler
async fn webhook(
    State(secret): State<String>,
    headers: HeaderMap,
    body: Bytes,
) -> StatusCode {
    let sig = headers.get("x-photon-signature").and_then(|v| v.to_str().ok()).unwrap_or("");
    let ts  = headers.get("x-photon-timestamp").and_then(|v| v.to_str().ok()).unwrap_or("");
    let raw = std::str::from_utf8(&body).unwrap_or("");

    if !verify_photon_webhook(raw, &secret, sig, ts) {
        return StatusCode::UNAUTHORIZED;
    }
    // handle payload...
    StatusCode::OK
}`,

  go: `package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

func verifyPhotonWebhook(rawBody, signingSecret, signature, timestamp string) bool {
	sigBase := fmt.Sprintf("v0:%s:%s", timestamp, rawBody)
	mac := hmac.New(sha256.New, []byte(signingSecret))
	mac.Write([]byte(sigBase))
	expected := "v0=" + hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}

func webhookHandler(w http.ResponseWriter, r *http.Request) {
	body, _ := io.ReadAll(r.Body)
	sig := r.Header.Get("X-Photon-Signature")
	ts  := r.Header.Get("X-Photon-Timestamp")

	if !verifyPhotonWebhook(string(body), os.Getenv("PHOTON_SIGNING_SECRET"), sig, ts) {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	var payload struct {
		Event string          \`json:"event"\`
		Data  json.RawMessage \`json:"data"\`
	}
	json.Unmarshal(body, &payload)
	// handle payload.Event...
	w.WriteHeader(http.StatusOK)
}`,
};

const PAYLOAD_SNIPPET = `import type { MessageResponse } from "@photon-ai/advanced-imessage-kit";

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
}`;

export default async function Home() {
  const [highlightedSnippets, highlightedPayload] = await Promise.all([
    Promise.all(
      LANGUAGES.map(async ({ id: lang }) => {
        const html = await codeToHtml(SNIPPETS[lang], {
          lang,
          themes: { light: "github-light", dark: "github-dark-dimmed" },
        });
        return [lang, html] as [Language, string];
      })
    ).then(Object.fromEntries<string>),
    codeToHtml(PAYLOAD_SNIPPET, {
      lang: "typescript",
      themes: { light: "github-light", dark: "github-dark-dimmed" },
    }),
  ]);

  return (
    <WebhookConfig
      highlightedPayload={highlightedPayload}
      highlightedSnippets={highlightedSnippets as Record<Language, string>}
    />
  );
}
