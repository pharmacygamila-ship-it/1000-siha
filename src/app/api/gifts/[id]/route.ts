import { NextRequest, NextResponse } from "next/server";
import db, { withRetry, isAdminRequest } from "@/lib/db";

// PUT /api/gifts/[id] - Update a gift (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.description !== undefined) data.description = String(body.description || "").trim();
    if (body.productId !== undefined) data.productId = Number(body.productId);
    if (body.minOrder !== undefined) data.minOrder = Number(body.minOrder) || 0;
    if (body.triggerProductIds !== undefined) data.triggerProductIds = JSON.stringify(Array.isArray(body.triggerProductIds) ? body.triggerProductIds : []);
    if (body.active !== undefined) data.active = Boolean(body.active);

    const gift = await withRetry(() =>
      db.gift.update({
        where: { id: Number(id) },
        data,
        include: { product: true },
      })
    );

    return NextResponse.json(gift);
  } catch (error) {
    console.error("PUT /api/gifts/[id] error:", error);
    return NextResponse.json({ error: "Failed to update gift" }, { status: 500 });
  }
}

// DELETE /api/gifts/[id] - Delete a gift (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const { id } = await params;
    await withRetry(() => db.gift.delete({ where: { id: Number(id) } }));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/gifts/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete gift" }, { status: 500 });
  }
}
