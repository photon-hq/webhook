"use server";

import { generateKeyPairSync } from "node:crypto";
import { db, webhookConfigs } from "@turbobun/db";
import { eq } from "drizzle-orm";

export interface ActionResult {
  data?: {
    publicKey: string;
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

  const { publicKey, privateKey } = generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

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
        publicKey,
        privateKey,
        updatedAt: new Date(),
      })
      .where(eq(webhookConfigs.serverUrl, serverUrl));

    return {
      success: true,
      message:
        "Server URL already exists. Updated API key, webhook, and regenerated secret.",
      data: { publicKey },
    };
  }

  await db.insert(webhookConfigs).values({
    serverUrl,
    apiKey,
    webhook,
    publicKey,
    privateKey,
  });

  return {
    success: true,
    message: "Webhook config created successfully.",
    data: { publicKey },
  };
}
