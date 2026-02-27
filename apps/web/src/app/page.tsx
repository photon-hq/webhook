"use client";

import { useActionState, useState } from "react";
import { type ActionResult, submitWebhookConfig } from "./actions";

export default function Home() {
  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(submitWebhookConfig, null);
  const [copied, setCopied] = useState(false);

  const isSuccess = state?.success && state.data;

  const handleCopy = async () => {
    if (!state?.data?.publicKey) {
      return;
    }
    await navigator.clipboard.writeText(state.data.publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBack = () => {
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background font-sans">
      <main className="flex w-full max-w-lg flex-col items-center gap-8 px-16 py-32 sm:items-start">
        <div className="flex flex-col items-center gap-3 text-center sm:items-start sm:text-left">
          <h1 className="font-semibold text-3xl text-black leading-10 tracking-tight dark:text-zinc-50">
            Advanced iMessage Kit Webhook
          </h1>
          <p className="text-lg text-zinc-600 leading-8 dark:text-zinc-400">
            {isSuccess
              ? "Your webhook has been configured successfully. Copy the public key below to use in your application."
              : "Create a secure webhook endpoint by providing your server URL, API key, and webhook URL."}
          </p>
        </div>

        {isSuccess ? (
          <div className="flex w-full flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="font-medium text-sm text-zinc-700 dark:text-zinc-300">
                Public Key
              </span>
              <div className="relative">
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-black/[.08] bg-transparent p-4 pr-12 font-mono text-black text-sm dark:border-white/[.145] dark:text-zinc-50">
                  {state.data?.publicKey}
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
            <div className="mt-2 flex flex-col gap-3">
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
          <>
            <form action={formAction} className="flex w-full flex-col gap-4">
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

            {state && !state.success && (
              <div className="w-full rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 text-sm dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                <p className="font-medium">{state.message}</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
