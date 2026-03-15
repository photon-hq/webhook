import { db, webhookConfigs } from "@turbobun/db";

export interface WebhookConfig {
  apiKey: string;
  signingSecret: string;
  webhook: string;
}

export class ConfigStore {
  private readonly configs = new Map<string, WebhookConfig[]>();

  async load() {
    const rows = await db.select().from(webhookConfigs);
    for (const row of rows) {
      const config: WebhookConfig = {
        apiKey: row.apiKey,
        signingSecret: row.signingSecret,
        webhook: row.webhook,
      };
      const existing = this.configs.get(row.serverUrl) ?? [];
      existing.push(config);
      this.configs.set(row.serverUrl, existing);
    }
    const total = [...this.configs.values()].reduce(
      (sum, arr) => sum + arr.length,
      0
    );
    console.log(
      `Loaded ${total} webhook configs across ${this.configs.size} servers`
    );
  }

  add(serverUrl: string, config: WebhookConfig) {
    const existing = this.configs.get(serverUrl) ?? [];
    const idx = existing.findIndex((c) => c.webhook === config.webhook);
    if (idx >= 0) {
      existing[idx] = config;
    } else {
      existing.push(config);
    }
    this.configs.set(serverUrl, existing);
  }

  getAll(serverUrl: string): WebhookConfig[] {
    return this.configs.get(serverUrl) ?? [];
  }

  remove(serverUrl: string, webhook: string): boolean {
    const existing = this.configs.get(serverUrl);
    if (!existing) {
      return false;
    }
    const filtered = existing.filter((c) => c.webhook !== webhook);
    if (filtered.length === 0) {
      this.configs.delete(serverUrl);
    } else {
      this.configs.set(serverUrl, filtered);
    }
    return filtered.length < existing.length;
  }

  hasServer(serverUrl: string): boolean {
    return (this.configs.get(serverUrl)?.length ?? 0) > 0;
  }

  serverUrls(): string[] {
    return [...this.configs.keys()];
  }

  entries(): IterableIterator<[string, WebhookConfig[]]> {
    return this.configs.entries();
  }

  get size(): number {
    return this.configs.size;
  }
}
