import { randomBytes } from "node:crypto";
import { AdvancedIMessageKit } from "@photon-ai/advanced-imessage-kit";
import { db, webhookConfigs } from "@turbobun/db";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

const SIGNING_SECRET_BYTE_LENGTH = 32 as const;
const VERIFY_TIMEOUT_MS = 5000;

function generateSigningSecret(): string {
  return randomBytes(SIGNING_SECRET_BYTE_LENGTH).toString("hex");
}

function isDbError(err: unknown): err is Error & { code: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as Record<string, unknown>).code === "string"
  );
}

async function verifyServerCredentials(
  serverUrl: string,
  apiKey: string
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const sdk = new AdvancedIMessageKit({
      serverUrl,
      apiKey,
      logLevel: "error",
    });

    let finished = false;
    const cleanup = (result: boolean) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      try { sdk.close(); } catch { /* already closed */ }
      resolve(result);
    };

    const timer = setTimeout(() => cleanup(false), VERIFY_TIMEOUT_MS);

    sdk.on("ready", () => cleanup(true));
    sdk.on("error", () => cleanup(false));

    sdk.connect().catch(() => cleanup(false));
  });
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

  if (!(await verifyServerCredentials(serverUrl, apiKey))) {
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
    const isUniqueViolation = isDbError(error) && error.code === "23505";

    if (isUniqueViolation) {
      const [existing] = await db
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
        .limit(1);

      if (existing) {
        if (existing.apiKey !== apiKey) {
          const signingSecret = generateSigningSecret();
          await db
            .update(webhookConfigs)
            .set({ apiKey, signingSecret, updatedAt: new Date() })
            .where(eq(webhookConfigs.id, existing.id));
          return NextResponse.json({ id: existing.id, signingSecret });
        }
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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const serverUrl = request.nextUrl.searchParams.get("serverUrl");
  const apiKey =
    request.headers.get("x-api-key") ??
    request.nextUrl.searchParams.get("apiKey");

  if (!serverUrl || !apiKey) {
    return NextResponse.json(
      { error: "serverUrl and apiKey (header x-api-key or query param) are required." },
      { status: 400 }
    );
  }

  if (!(await verifyServerCredentials(serverUrl, apiKey))) {
    return NextResponse.json(
      { error: "Invalid server URL or API key." },
      { status: 401 }
    );
  }

  try {
    const rows = await db
      .select({
        id: webhookConfigs.id,
        serverUrl: webhookConfigs.serverUrl,
        webhookUrl: webhookConfigs.webhook,
        createdAt: webhookConfigs.createdAt,
      })
      .from(webhookConfigs)
      .where(eq(webhookConfigs.serverUrl, serverUrl));

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Failed to fetch webhook configs:", error);
    return NextResponse.json(
      { error: "Failed to fetch webhook configs." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const serverUrl = request.nextUrl.searchParams.get("serverUrl");
  const apiKey =
    request.headers.get("x-api-key") ??
    request.nextUrl.searchParams.get("apiKey");

  if (!serverUrl || !apiKey) {
    return NextResponse.json(
      { error: "serverUrl and apiKey (header x-api-key or query param) are required." },
      { status: 400 }
    );
  }

  if (!(await verifyServerCredentials(serverUrl, apiKey))) {
    return NextResponse.json(
      { error: "Invalid server URL or API key." },
      { status: 401 }
    );
  }

  try {
    const deleted = await db
      .delete(webhookConfigs)
      .where(eq(webhookConfigs.serverUrl, serverUrl))
      .returning({ id: webhookConfigs.id });

    return NextResponse.json({ deleted: deleted.length });
  } catch (error) {
    console.error("Failed to delete webhook configs:", error);
    return NextResponse.json(
      { error: "Failed to delete webhook configs." },
      { status: 500 }
    );
  }
}
