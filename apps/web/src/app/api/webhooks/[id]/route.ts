import { db, webhookConfigs } from "@turbobun/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createErrorResponse } from "../errors";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  if (!id) {
    return createErrorResponse(
      "WEBHOOK_ID_REQUIRED",
      "Webhook ID is required."
    );
  }

  try {
    const deleted = await db
      .delete(webhookConfigs)
      .where(eq(webhookConfigs.id, id))
      .returning({ id: webhookConfigs.id });

    if (deleted.length === 0) {
      return createErrorResponse("WEBHOOK_NOT_FOUND", "Webhook not found.");
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete webhook config:", error);
    return createErrorResponse(
      "DATABASE_ERROR",
      "Failed to delete webhook config."
    );
  }
}
