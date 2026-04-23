import { NextRequest, NextResponse } from "next/server";
import db, { withRetry, isAdminRequest } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = parseInt(id);
    if (isNaN(numId)) {
      return NextResponse.json({ error: "معرف غير صالح" }, { status: 400 });
    }

    const product = await withRetry(() =>
      db.product.findUnique({
        where: { id: numId },
      })
    );

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...product,
      tags: Array.isArray(product.tags) ? product.tags : [],
      images: Array.isArray(product.images) ? product.images : [],
      video: product.video || "",
      relatedIds: Array.isArray(product.relatedIds) ? product.relatedIds : [],
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("GET /api/products/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const numId = parseInt(id);
    if (isNaN(numId)) {
      return NextResponse.json({ error: "معرف غير صالح" }, { status: 400 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) data.name = String(body.name).trim().substring(0, 200);
    if (body.cat !== undefined) data.cat = body.cat;
    if (body.price !== undefined) {
      const p = Number(body.price);
      if (isNaN(p) || p < 0) return NextResponse.json({ error: "السعر غير صالح" }, { status: 400 });
      data.price = p;
    }
    if (body.disc !== undefined) data.disc = Math.min(Math.max(Number(body.disc) || 0, 0), 100);
    if (body.desc !== undefined) data.desc = String(body.desc).substring(0, 2000);
    if (body.tags !== undefined) data.tags = Array.isArray(body.tags) ? body.tags : [];
    if (body.img !== undefined) data.img = body.img;
    if (body.images !== undefined) data.images = Array.isArray(body.images) ? body.images : [];
    if (body.video !== undefined) data.video = body.video;
    if (body.relatedIds !== undefined) data.relatedIds = Array.isArray(body.relatedIds) ? body.relatedIds : [];
    if (body.rating !== undefined) data.rating = Math.min(Math.max(Number(body.rating) || 0, 0), 5);
    if (body.reviews !== undefined) data.reviews = Math.max(Number(body.reviews) || 0, 0);
    if (body.sold !== undefined) data.sold = Math.max(Number(body.sold) || 0, 0);
    if (body.stock !== undefined) data.stock = Math.max(Number(body.stock) || 0, 0);

    const product = await withRetry(() =>
      db.product.update({
        where: { id: numId },
        data,
      })
    );

    return NextResponse.json({
      ...product,
      tags: Array.isArray(product.tags) ? product.tags : [],
      images: Array.isArray(product.images) ? product.images : [],
      video: product.video || "",
      relatedIds: Array.isArray(product.relatedIds) ? product.relatedIds : [],
    });
  } catch (error) {
    console.error("PUT /api/products/[id] error:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const numId = parseInt(id);
    if (isNaN(numId)) {
      return NextResponse.json({ error: "معرف غير صالح" }, { status: 400 });
    }

    await withRetry(() =>
      db.product.delete({
        where: { id: numId },
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/products/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}