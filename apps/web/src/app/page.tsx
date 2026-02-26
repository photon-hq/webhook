export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-lg flex-col items-center gap-8 bg-white px-16 py-32 sm:items-start dark:bg-black">
        <div className="flex flex-col items-center gap-3 text-center sm:items-start sm:text-left">
          <h1 className="font-semibold text-3xl text-black leading-10 tracking-tight dark:text-zinc-50">
            Advanced iMessage Kit Webhook
          </h1>
          <p className="text-lg text-zinc-600 leading-8 dark:text-zinc-400">
            Create a secure webhook endpoint by providing your server URL and
            authentication key.
          </p>
        </div>
        <form className="flex w-full flex-col gap-4">
          <label className="flex flex-col gap-1.5" htmlFor="server-url">
            <span className="font-medium text-sm text-zinc-700 dark:text-zinc-300">
              Server URL
            </span>
            <input
              className="h-12 rounded-lg border border-black/[.08] bg-transparent px-4 text-base text-black outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-950 dark:border-white/[.145] dark:text-zinc-50 dark:focus:border-zinc-50 dark:placeholder:text-zinc-600"
              id="server-url"
              name="serverUrl"
              placeholder="https://example.com/webhook"
              type="url"
            />
          </label>
          <label className="flex flex-col gap-1.5" htmlFor="key">
            <span className="font-medium text-sm text-zinc-700 dark:text-zinc-300">
              Key
            </span>
            <input
              className="h-12 rounded-lg border border-black/[.08] bg-transparent px-4 text-base text-black outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-950 dark:border-white/[.145] dark:text-zinc-50 dark:focus:border-zinc-50 dark:placeholder:text-zinc-600"
              id="key"
              name="key"
              placeholder="your-secret-key"
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
              type="url"
            />
          </label>
          <button
            className="mt-2 flex h-12 w-full items-center justify-center rounded-full bg-foreground font-medium text-background text-base transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            type="submit"
          >
            Config
          </button>
        </form>
      </main>
    </div>
  );
}
