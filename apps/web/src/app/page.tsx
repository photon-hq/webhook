"use client";

import { useActionState } from "react";
import { type ActionResult, submitWebhookConfig } from "./actions";

export default function Home() {
  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(submitWebhookConfig, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-lg flex-col items-center gap-8 bg-white px-16 py-32 sm:items-start dark:bg-black">
        <div className="flex flex-col items-center gap-3 text-center sm:items-start sm:text-left">
          <h1 className="font-semibold text-3xl text-black leading-10 tracking-tight dark:text-zinc-50">
            Advanced iMessage Kit Webhook
          </h1>
          <p className="text-lg text-zinc-600 leading-8 dark:text-zinc-400">
            Create a secure webhook endpoint by providing your server URL, API
            key, and webhook URL.
          </p>
        </div>
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

        {state && (
          <div
            className={`w-full rounded-lg border p-4 text-sm ${
              state.success
                ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
            }`}
          >
            <p className="font-medium">{state.message}</p>
            {state.data && (
              <div className="mt-3 flex flex-col gap-2">
                <div>
                  <span className="font-medium">Public Key:</span>
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-black/5 p-2 text-xs dark:bg-white/5">
                    {state.data.publicKey}
                  </pre>
                </div>
                <div>
                  <span className="font-medium">Private Key:</span>
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-black/5 p-2 text-xs dark:bg-white/5">
                    {state.data.privateKey}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
