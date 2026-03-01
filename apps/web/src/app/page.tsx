"use client";

import { useState } from "react";
import { toast } from "sonner";
import { type ActionResult, submitWebhookConfig } from "./actions";

type Language = "typescript" | "python" | "rust" | "go";

const LANGUAGES: { id: Language; label: string }[] = [
  { id: "typescript", label: "TypeScript" },
  { id: "python", label: "Python" },
  { id: "rust", label: "Rust" },
  { id: "go", label: "Go" },
];

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

export default function Home() {
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<Language>("typescript");

  const isSuccess = result?.success && result.data?.signingSecret;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setIsPending(true);

    const promise = submitWebhookConfig(null, formData)
      .then((res) => {
        if (!res.success) {
          throw new Error(res.message);
        }
        setResult(res);
        return res;
      })
      .finally(() => setIsPending(false));

    toast.promise(promise, {
      loading: "Configuring webhook...",
      success: (res) => res.message,
      error: (err) => err.message,
    });
  };

  const handleCopy = async () => {
    if (!result?.data?.signingSecret) {
      return;
    }
    await navigator.clipboard.writeText(result.data.signingSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBack = () => {
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background font-sans">
      <main
        className={`flex w-full flex-col items-center gap-8 px-8 py-16 sm:items-start sm:px-16 sm:py-32 ${isSuccess ? "max-w-3xl" : "max-w-lg"}`}
      >
        <div className="flex flex-col items-center gap-3 text-center sm:items-start sm:text-left">
          <h1 className="font-semibold text-3xl text-black leading-10 tracking-tight dark:text-zinc-50">
            Advanced iMessage Kit Webhook
          </h1>
          <p className="text-lg text-zinc-600 leading-8 dark:text-zinc-400">
            {isSuccess
              ? "Your webhook has been configured successfully. Copy the signing secret below to use in your application."
              : "Create a secure webhook endpoint by providing your server URL, API key, and webhook URL."}
          </p>
        </div>

        {isSuccess ? (
          <div className="flex w-full flex-col gap-6">
            {/* Signing secret */}
            <div className="flex flex-col gap-1.5">
              <span className="font-medium text-sm text-zinc-700 dark:text-zinc-300">
                Signing Secret
              </span>
              <div className="relative">
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-black/[.08] bg-transparent p-4 pr-12 font-mono text-black text-sm dark:border-white/[.145] dark:text-zinc-50">
                  {result.data?.signingSecret}
                </pre>
                <button
                  className="absolute top-3 right-3 rounded-md border border-black/[.08] bg-white p-1.5 text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-700 dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  onClick={handleCopy}
                  type="button"
                >
                  {copied ? (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <title>Copied</title>
                      <path
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <title>Copy to clipboard</title>
                      <rect
                        height="13"
                        rx="2"
                        ry="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        width="13"
                        x="9"
                        y="9"
                      />
                      <path
                        d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Integration guide */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-base text-black dark:text-zinc-50">
                  Verify incoming requests
                </span>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Every request includes{" "}
                  <code className="font-mono text-xs">X-Photon-Signature</code>{" "}
                  and{" "}
                  <code className="font-mono text-xs">X-Photon-Timestamp</code>{" "}
                  headers. Use your signing secret to verify authenticity before
                  processing.
                </p>
              </div>

              {/* Language tabs */}
              <div className="flex gap-1 rounded-lg border border-black/[.08] bg-zinc-50 p-1 dark:border-white/[.145] dark:bg-zinc-900">
                {LANGUAGES.map(({ id, label }) => (
                  <button
                    className={`flex-1 rounded-md px-3 py-1.5 font-medium text-sm transition-colors ${
                      activeTab === id
                        ? "bg-white text-black shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                        : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                    }`}
                    key={id}
                    onClick={() => setActiveTab(id)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Code block */}
              <pre className="overflow-x-auto rounded-lg border border-black/[.08] bg-zinc-50 p-4 font-mono text-xs text-zinc-800 leading-relaxed dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-200">
                {SNIPPETS[activeTab]}
              </pre>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <a
                className="flex h-12 w-full items-center justify-center rounded-full bg-foreground font-medium text-background text-base transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
                href="https://github.com/photon-hq/webhook"
                rel="noopener"
                target="_blank"
              >
                View Documentation
              </a>
              <button
                className="flex h-12 w-full items-center justify-center rounded-full border border-black/[.08] bg-transparent font-medium text-base text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-zinc-800"
                onClick={handleBack}
                type="button"
              >
                Back
              </button>
            </div>
          </div>
        ) : (
          <form className="flex w-full flex-col gap-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-1.5" htmlFor="server-url">
              <span className="font-medium text-sm text-zinc-700 dark:text-zinc-300">
                Server URL
              </span>
              <input
                className="h-12 rounded-lg border border-black/[.08] bg-transparent px-4 text-base text-black outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-950 dark:border-white/[.145] dark:text-zinc-50 dark:focus:border-zinc-50 dark:placeholder:text-zinc-600"
                id="server-url"
                name="serverUrl"
                placeholder="https://example.com/webhook"
                required
                type="url"
              />
            </label>
            <label className="flex flex-col gap-1.5" htmlFor="api-key">
              <span className="font-medium text-sm text-zinc-700 dark:text-zinc-300">
                API Key
              </span>
              <input
                className="h-12 rounded-lg border border-black/[.08] bg-transparent px-4 text-base text-black outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-950 dark:border-white/[.145] dark:text-zinc-50 dark:focus:border-zinc-50 dark:placeholder:text-zinc-600"
                id="api-key"
                name="apiKey"
                placeholder="your-api-key"
                required
                type="text"
              />
            </label>
            <label className="flex flex-col gap-1.5" htmlFor="webhook-url">
              <span className="font-medium text-sm text-zinc-700 dark:text-zinc-300">
                Webhook URL
              </span>
              <input
                className="h-12 rounded-lg border border-black/[.08] bg-transparent px-4 text-base text-black outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-950 dark:border-white/[.145] dark:text-zinc-50 dark:focus:border-zinc-50 dark:placeholder:text-zinc-600"
                id="webhook-url"
                name="webhookUrl"
                placeholder="https://example.com/hook"
                required
                type="url"
              />
            </label>
            <button
              className="mt-2 flex h-12 w-full items-center justify-center rounded-full bg-foreground font-medium text-background text-base transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
              disabled={isPending}
              type="submit"
            >
              {isPending ? "Configuring..." : "Config"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
