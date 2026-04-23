import { NextRequest, NextResponse } from "next/server";
import db, { withRetry, isAdminRequest } from "@/lib/db";

// PUT /api/categories/[id] - Update a category (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.icon !== undefined) data.icon = body.icon;
    if (body.order !== undefined) data.order = body.order;

    const category = await withRetry(() =>
      db.category.update({
        where: { id: parseInt(id) },
        data,
      })
    );
    return NextResponse.json(category);
  } catch (error) {
    console.error("PUT /api/categories/[id] error:", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

// DELETE /api/categories/[id] - Delete a category (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  try {
    const { id } = await params;
    await withRetry(() =>
      db.category.delete({
        where: { id: parseInt(id) },
      })
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/categories/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
