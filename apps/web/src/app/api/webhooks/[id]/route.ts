import { db, webhookConfigs } from "@turbobun/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "Webhook ID is required." },
      { status: 400 }
    );
  }

  const deleted = await db
    .delete(webhookConfigs)
    .where(eq(webhookConfigs.id, id))
    .returning({ id: webhookConfigs.id });

  if (deleted.length === 0) {
    return NextResponse.json(
      { error: "Webhook not found." },
      { status: 404 }
    );
  }

  return new NextResponse(null, { status: 204 });
}
