import { NextRequest, NextResponse } from "next/server";
import db, { withRetry, isAdminRequest } from "@/lib/db";

// GET /api/gifts - List all gifts (with product info)
export async function GET(req: NextRequest) {
  try {
    const gifts = await withRetry(() =>
      db.gift.findMany({
        orderBy: { createdAt: "desc" },
        include: { product: true },
      })
    );
    // Parse triggerProductIds and product tags/images in response for client
    const parsed = gifts.map((g) => ({
      ...g,
      triggerProductIds: (() => {
        try { return Array.isArray(g.triggerProductIds) ? g.triggerProductIds : JSON.parse(g.triggerProductIds || "[]"); }
        catch { return []; }
      })(),
      product: g.product ? {
        ...g.product,
        tags: (() => { try { return JSON.parse(g.product.tags || "[]"); } catch { return []; } })(),
        images: (() => { try { return JSON.parse(g.product.images || "[]"); } catch { return []; } })(),
        video: g.product.video || "",
      } : g.product,
    }));
    return NextResponse.json(parsed, {
      headers: { "Cache-Control": "private, s-maxage=10" },
    });
  } catch (error) {
    console.error("GET /api/gifts error:", error);
    return NextResponse.json({ error: "Failed to fetch gifts" }, { status: 500 });
  }
}

// POST /api/gifts - Create a gift (admin only)
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const body = await req.json();

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "اسم الهدية مطلوب" }, { status: 400 });
    }
    if (!body.productId) {
      return NextResponse.json({ error: "اختار المنتج اللي هيكون هدية" }, { status: 400 });
    }

    // Verify product exists
    const product = await db.product.findUnique({ where: { id: Number(body.productId) } });
    if (!product) {
      return NextResponse.json({ error: "المنتج غير موجود" }, { status: 400 });
    }

    const gift = await withRetry(() =>
      db.gift.create({
        data: {
          name: String(body.name).trim(),
          description: String(body.description || "").trim(),
          productId: Number(body.productId),
          minOrder: Number(body.minOrder) || 0,
          triggerProductIds: JSON.stringify(Array.isArray(body.triggerProductIds) ? body.triggerProductIds : []),
          active: body.active !== false,
        },
        include: { product: true },
      })
    );

    return NextResponse.json(gift, { status: 201 });
  } catch (error) {
    console.error("POST /api/gifts error:", error);
    return NextResponse.json({ error: "Failed to create gift" }, { status: 500 });
  }
}
