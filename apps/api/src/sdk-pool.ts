import { createHmac } from "node:crypto";
import {
  AdvancedIMessageKit,
  type PhotonEventName,
} from "@photon-ai/advanced-imessage-kit";
import type { ConfigStore } from "./config-store.js";

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
    const promises = entries.map(([serverUrl, config]) =>
      this.add(serverUrl, config.apiKey)
    );
    await Promise.all(promises);
    console.log(`SDKPool initialized with ${this.instances.size} instances`);
  }

  async add(serverUrl: string, apiKey: string): Promise<void> {
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
    const config = this.store.get(serverUrl);
    if (!config) {
      return;
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = JSON.stringify({ event, data });
    const sigBase = `v0:${timestamp}:${body}`;
    const signature = createHmac("sha256", config.signingSecret)
      .update(sigBase)
      .digest("hex");

    const response = await fetch(config.webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Photon-Signature": `v0=${signature}`,
        "X-Photon-Timestamp": timestamp,
      },
      body,
    });

    if (!response.ok) {
      console.error(
        `Webhook delivery failed for ${serverUrl} [${event}]: HTTP ${response.status}`
      );
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
