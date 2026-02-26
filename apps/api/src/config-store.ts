import { db, webhookConfigs } from "@turbobun/db";

interface WebhookConfig {
  apiKey: string;
  privateKey: string;
  webhook: string;
}

export class ConfigStore {
  private configs = new Map<string, WebhookConfig>();

  async load() {
    const rows = await db.select().from(webhookConfigs);
    for (const row of rows) {
      this.configs.set(row.serverUrl, {
        apiKey: row.apiKey,
        privateKey: row.privateKey,
        webhook: row.webhook,
      });
    }
    console.log(`Loaded ${this.configs.size} webhook configs`);
  }

  set(serverUrl: string, config: WebhookConfig) {
    this.configs.set(serverUrl, config);
  }

  get(serverUrl: string): WebhookConfig | undefined {
    return this.configs.get(serverUrl);
  }

  has(serverUrl: string): boolean {
    return this.configs.has(serverUrl);
  }

  delete(serverUrl: string): boolean {
    return this.configs.delete(serverUrl);
  }

  get size(): number {
    return this.configs.size;
  }
}
