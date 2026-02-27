import { AdvancedIMessageKit } from "@photon-ai/advanced-imessage-kit";
import type { ConfigStore } from "./config-store.js";

export class SDKPool {
  private readonly instances = new Map<string, AdvancedIMessageKit>();

  async initialize(store: ConfigStore): Promise<void> {
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
      this.instances.set(serverUrl, sdk);
      console.log(`SDK connected: ${serverUrl}`);
    } catch (error) {
      console.error(`Failed to connect SDK for ${serverUrl}:`, error);
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
