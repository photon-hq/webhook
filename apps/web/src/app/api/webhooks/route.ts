import { randomBytes } from "node:crypto";
import { AdvancedIMessageKit } from "@photon-ai/advanced-imessage-kit";
import { db, webhookConfigs } from "@turbobun/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { serverUrl, apiKey, webhookUrl } = body as Record<string, unknown>;

  if (
    typeof serverUrl !== "string" ||
    typeof apiKey !== "string" ||
    typeof webhookUrl !== "string" ||
    !serverUrl ||
    !apiKey ||
    !webhookUrl
  ) {
    return NextResponse.json(
      { error: "serverUrl, apiKey, and webhookUrl are required strings." },
      { status: 400 }
    );
  }

  try {
    new URL(serverUrl);
    new URL(webhookUrl);
  } catch {
    return NextResponse.json(
      { error: "Invalid URL format." },
      { status: 400 }
    );
  }

  const verified = await new Promise<boolean>((resolve) => {
    const sdk = new AdvancedIMessageKit({
      serverUrl,
      apiKey,
      logLevel: "error",
    });

    const cleanup = (result: boolean) => {
      clearTimeout(timer);
      sdk.close();
      resolve(result);
    };

    const timer = setTimeout(() => cleanup(false), 5000);

    sdk.on("ready", () => cleanup(true));
    sdk.on("error", () => cleanup(false));

    sdk.connect().catch(() => cleanup(false));
  });

  if (!verified) {
    return NextResponse.json(
      { error: "Invalid server URL or API key." },
      { status: 401 }
    );
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
        webhook: webhookUrl,
        signingSecret,
        updatedAt: new Date(),
      })
      .where(eq(webhookConfigs.serverUrl, serverUrl));

    return NextResponse.json({
      id: existing[0].id,
      signingSecret,
    });
  }

  const [inserted] = await db
    .insert(webhookConfigs)
    .values({
      serverUrl,
      apiKey,
      webhook: webhookUrl,
      signingSecret,
    })
    .returning({ id: webhookConfigs.id });

  return NextResponse.json({ id: inserted.id, signingSecret }, { status: 201 });
}
