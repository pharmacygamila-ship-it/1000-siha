import { NextRequest, NextResponse } from "next/server";
import db, { withRetry, isAdminRequest } from "@/lib/db";

// PUT /api/coupons/[id] - Update a coupon (admin only)
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
    if (body.code !== undefined) data.code = String(body.code).trim().toUpperCase();
    if (body.type !== undefined) data.type = body.type === "fixed" ? "fixed" : "percentage";
    if (body.value !== undefined) data.value = Number(body.value) || 0;
    if (body.minOrder !== undefined) data.minOrder = Number(body.minOrder) || 0;
    if (body.maxUses !== undefined) data.maxUses = Number(body.maxUses) || 0;
    if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    if (body.productIds !== undefined) data.productIds = JSON.stringify(Array.isArray(body.productIds) ? body.productIds : []);
    if (body.active !== undefined) data.active = Boolean(body.active);

    const coupon = await withRetry(() =>
      db.coupon.update({
        where: { id: Number(id) },
        data,
      })
    );

    return NextResponse.json(coupon);
  } catch (error) {
    console.error("PUT /api/coupons/[id] error:", error);
    return NextResponse.json({ error: "Failed to update coupon" }, { status: 500 });
  }
}

// DELETE /api/coupons/[id] - Delete a coupon (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const { id } = await params;
    await withRetry(() => db.coupon.delete({ where: { id: Number(id) } }));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/coupons/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete coupon" }, { status: 500 });
  }
}
