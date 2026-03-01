"use server";

import { randomBytes } from "node:crypto";
import { AdvancedIMessageKit } from "@photon-ai/advanced-imessage-kit";
import { db, webhookConfigs } from "@turbobun/db";
import { eq } from "drizzle-orm";

export interface ActionResult {
  data?: {
    signingSecret: string;
  };
  message: string;
  success: boolean;
}

export async function submitWebhookConfig(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const serverUrl = formData.get("serverUrl") as string | null;
  const apiKey = formData.get("apiKey") as string | null;
  const webhook = formData.get("webhookUrl") as string | null;

  if (!(serverUrl && apiKey && webhook)) {
    return {
      success: false,
      message: "All fields are required.",
    };
  }

  try {
    new URL(serverUrl);
    new URL(webhook);
  } catch {
    return { success: false, message: "Invalid URL format." };
  }

  const verified = await new Promise<boolean>((resolve) => {
    const sdk = new AdvancedIMessageKit({
      serverUrl,
      apiKey,
      logLevel: "error",
    });

    const cleanup = (result: boolean) => {
      clearTimeout(timer);
      sdk.close()
      resolve(result);
    };

    const timer = setTimeout(() => cleanup(false), 5000);

    sdk.on("ready", () => cleanup(true));
    sdk.on("error", () => cleanup(false));

    sdk.connect().catch(() => cleanup(false));
  });

  if (!verified) {
    return { success: false, message: "Invalid server URL or API key." };
  }

  const signingSecret = randomBytes(32).toString("hex");

  const existing = await db
    .select({ id: webhookConfigs.id })
    .from(webhookConfigs)
    .where(eq(webhookConfigs.serverUrl, serverUrl))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(webhookConfigs)
      .set({
        apiKey,
        webhook,
        signingSecret,
        updatedAt: new Date(),
      })
      .where(eq(webhookConfigs.serverUrl, serverUrl));

    return {
      success: true,
      message:
        "Server URL already exists. Updated API key, webhook, and regenerated signing secret.",
      data: { signingSecret },
    };
  }

  await db.insert(webhookConfigs).values({
    serverUrl,
    apiKey,
    webhook,
    signingSecret,
  });

  return {
    success: true,
    message: "Webhook config created successfully.",
    data: { signingSecret },
  };
}
