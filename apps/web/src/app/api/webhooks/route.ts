import { randomBytes } from "node:crypto";
import { AdvancedIMessageKit } from "@photon-ai/advanced-imessage-kit";
import { db, webhookConfigs } from "@turbobun/db";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

const SIGNING_SECRET_BYTE_LENGTH = 32 as const;

function generateSigningSecret(): string {
  return randomBytes(SIGNING_SECRET_BYTE_LENGTH).toString("hex");
}

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

  let result: { id: string; signingSecret: string; created: boolean };

  try {
    result = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({
          id: webhookConfigs.id,
          apiKey: webhookConfigs.apiKey,
          signingSecret: webhookConfigs.signingSecret,
        })
        .from(webhookConfigs)
        .where(
          and(
            eq(webhookConfigs.serverUrl, serverUrl),
            eq(webhookConfigs.webhook, webhookUrl)
          )
        )
        .limit(1)
        .for("update");

      if (existing) {
        if (existing.apiKey !== apiKey) {
          const signingSecret = generateSigningSecret();
          await tx
            .update(webhookConfigs)
            .set({ apiKey, signingSecret, updatedAt: new Date() })
            .where(eq(webhookConfigs.id, existing.id));
          return { id: existing.id, signingSecret, created: false };
        }
        return { id: existing.id, signingSecret: existing.signingSecret, created: false };
      }

      const signingSecret = generateSigningSecret();
      const [inserted] = await tx
        .insert(webhookConfigs)
        .values({ serverUrl, apiKey, webhook: webhookUrl, signingSecret })
        .returning({ id: webhookConfigs.id });
      return { id: inserted.id, signingSecret, created: true };
    });
  } catch (error) {
    const isUniqueViolation =
      error instanceof Error && "code" in error && (error as { code: string }).code === "23505";

    if (isUniqueViolation) {
      const [existing] = await db
        .select({
          id: webhookConfigs.id,
          signingSecret: webhookConfigs.signingSecret,
        })
        .from(webhookConfigs)
        .where(
          and(
            eq(webhookConfigs.serverUrl, serverUrl),
            eq(webhookConfigs.webhook, webhookUrl)
          )
        )
        .limit(1);

      if (existing) {
        return NextResponse.json({
          id: existing.id,
          signingSecret: existing.signingSecret,
        });
      }
    }

    console.error("Failed to upsert webhook config:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { id: result.id, signingSecret: result.signingSecret },
    { status: result.created ? 201 : 200 }
  );
}
