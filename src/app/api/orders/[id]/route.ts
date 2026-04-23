import { NextRequest, NextResponse } from "next/server";
import db, { withRetry, isAdminRequest } from "@/lib/db";

// GET /api/orders/[id] - Get a single order (admin only - contains PII)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const order = await withRetry(() =>
      db.order.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      })
    );
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    const transformed = {
      id: order.id,
      name: order.name,
      phone: order.phone,
      gov: order.gov,
      addr: order.addr,
      notes: order.notes,
      total: order.total,
      status: order.status,
      date: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        id: item.productId,
        qty: item.qty,
      })),
    };
    return NextResponse.json(transformed);
  } catch (error) {
    console.error("GET /api/orders/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

// PUT /api/orders/[id] - Update order status (admin only)
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
    if (body.status !== undefined) data.status = body.status;
    if (body.name !== undefined) data.name = body.name;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.gov !== undefined) data.gov = body.gov;
    if (body.addr !== undefined) data.addr = body.addr;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.total !== undefined) data.total = body.total;

    const order = await withRetry(() =>
      db.order.update({
        where: { id },
        data,
      })
    );
    return NextResponse.json(order);
  } catch (error) {
    console.error("PUT /api/orders/[id] error:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

// DELETE /api/orders/[id] - Delete an order (admin only)
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
      db.order.delete({
        where: { id },
      })
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/orders/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}
