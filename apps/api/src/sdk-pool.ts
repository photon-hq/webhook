import { createHmac } from "node:crypto";
import {
  AdvancedIMessageKit,
  type PhotonEventName,
} from "@photon-ai/advanced-imessage-kit";
import type { ConfigStore } from "./config-store.js";

const REQUEST_TIMEOUT_MS = 10_000;

const FORWARDED_EVENTS: PhotonEventName[] = [
  "new-message",
  "updated-message",
  "message-send-error",
  "chat-read-status-changed",
  "group-name-change",
  "participant-added",
  "participant-removed",
  "participant-left",
  "group-icon-changed",
  "group-icon-removed",
  "typing-indicator",
  "new-server",
  "server-update",
  "server-update-downloading",
  "server-update-installing",
  "ft-call-status-changed",
  "new-findmy-location",
  "scheduled-message-created",
  "scheduled-message-updated",
  "scheduled-message-deleted",
  "scheduled-message-sent",
  "scheduled-message-error",
];

export class SDKPool {
  private readonly instances = new Map<string, AdvancedIMessageKit>();
  private store!: ConfigStore;

  async initialize(store: ConfigStore): Promise<void> {
    this.store = store;
    const entries = [...store.entries()];
    // One SDK connection per server — all webhooks for the same server share
    // the connection, so we use the first config's apiKey to authenticate.
    const promises = entries
      .filter(([, configs]) => configs.length > 0)
      .map(([serverUrl, configs]) =>
        this.add(serverUrl, configs[0].apiKey)
      );
    await Promise.all(promises);
    console.log(`SDKPool initialized with ${this.instances.size} instances`);
  }

  async add(serverUrl: string, apiKey: string): Promise<void> {
    if (this.instances.has(serverUrl)) {
      console.log(`SDK already connected for ${serverUrl}, skipping`);
      return;
    }

    try {
      const sdk = new AdvancedIMessageKit({ serverUrl, apiKey });
      await sdk.connect();
      this.attachListeners(serverUrl, sdk);
      this.instances.set(serverUrl, sdk);
      console.log(`SDK connected: ${serverUrl}`);
    } catch (error) {
      console.error(`Failed to connect SDK for ${serverUrl}:`, error);
    }
  }

  private attachListeners(serverUrl: string, sdk: AdvancedIMessageKit): void {
    for (const event of FORWARDED_EVENTS) {
      sdk.on(event, (data) => {
        this.forwardEvent(serverUrl, event, data).catch((error) => {
          console.error(
            `Failed to forward event "${event}" for ${serverUrl}:`,
            error
          );
        });
      });
    }
  }

  private async forwardEvent(
    serverUrl: string,
    event: PhotonEventName,
    data: unknown
  ): Promise<void> {
    const configs = this.store.getAll(serverUrl);
    if (configs.length === 0) {
      return;
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = JSON.stringify({ event, data });

    const results = await Promise.allSettled(
      configs.map(async (config) => {
        const sigBase = `v0:${timestamp}:${body}`;
        const signature = createHmac("sha256", config.signingSecret)
          .update(sigBase)
          .digest("hex");

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
          const response = await fetch(config.webhook, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Photon-Signature": `v0=${signature}`,
              "X-Photon-Timestamp": timestamp,
            },
            body,
            signal: controller.signal,
          });

          if (!response.ok) {
            console.error(
              `Webhook delivery failed for ${serverUrl} → ${config.webhook} [${event}]: HTTP ${response.status}`
            );
          }
        } finally {
          clearTimeout(timeout);
        }
      })
    );

    for (const [i, result] of results.entries()) {
      if (result.status === "rejected") {
        console.error(
          `Webhook delivery error for ${serverUrl} → ${configs[i].webhook} [${event}]:`,
          result.reason
        );
      }
    }
  }

  async remove(serverUrl: string): Promise<void> {
    const sdk = this.instances.get(serverUrl);
    if (!sdk) {
      return;
    }

    try {
      await sdk.close();
      console.log(`SDK closed: ${serverUrl}`);
    } catch (error) {
      console.error(`Error closing SDK for ${serverUrl}:`, error);
    }

    this.instances.delete(serverUrl);
  }

  async update(serverUrl: string, apiKey: string): Promise<void> {
    await this.remove(serverUrl);
    await this.add(serverUrl, apiKey);
  }

  get(serverUrl: string): AdvancedIMessageKit | undefined {
    return this.instances.get(serverUrl);
  }

  async closeAll(): Promise<void> {
    const serverUrls = [...this.instances.keys()];
    const promises = serverUrls.map((serverUrl) => this.remove(serverUrl));
    await Promise.all(promises);
    console.log("All SDK instances closed");
  }

  get size(): number {
    return this.instances.size;
  }
}
