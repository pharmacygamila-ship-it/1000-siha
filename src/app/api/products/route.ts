import { NextRequest, NextResponse } from "next/server";
import db, { withRetry, isAdminRequest } from "@/lib/db";
import { RateLimiter } from "@/lib/api-utils";

const rateLimiter = new RateLimiter({ maxRequests: 60 });

export async function GET(req: NextRequest) {
  const rateLimitError = rateLimiter.check(req);
  if (rateLimitError) return rateLimitError;

  try {
    const products = await withRetry(() =>
      db.product.findMany({
        orderBy: { id: "asc" },
      })
    );

    const parsed = products.map((p) => ({
      ...p,
      tags: Array.isArray(p.tags) ? p.tags : [],
      images: Array.isArray(p.images) ? p.images : [],
      video: p.video || "",
      relatedIds: Array.isArray(p.relatedIds) ? p.relatedIds : [],
    }));

    return NextResponse.json(parsed, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("GET /api/products error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const rateLimitError = rateLimiter.check(req, { maxRequests: 30 });
  if (rateLimitError) return rateLimitError;

  try {
    const body = await req.json();

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "اسم المنتج مطلوب" }, { status: 400 });
    }

    const price = Number(body.price);
    if (isNaN(price) || price < 0) {
      return NextResponse.json({ error: "السعر غير صالح" }, { status: 400 });
    }

    const disc = Math.min(Math.max(Number(body.disc) || 0, 0), 100);
    const rating = Math.min(Math.max(Number(body.rating) || 0, 0), 5);
    const reviews = Math.max(Number(body.reviews) || 0, 0);
    const sold = Math.max(Number(body.sold) || 0, 0);

    const product = await withRetry(() =>
      db.product.create({
        data: {
          name: String(body.name).trim().substring(0, 200),
          cat: body.cat || "عام",
          price,
          disc,
          desc: String(body.desc || "").substring(0, 2000),
          tags: Array.isArray(body.tags) ? body.tags : [],
          img: body.img || "",
          images: Array.isArray(body.images) ? body.images : [],
          video: body.video || "",
          relatedIds: Array.isArray(body.relatedIds) ? body.relatedIds : [],
          rating,
          reviews,
          sold,
          stock: Number(body.stock) || 0,
        },
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
    console.error("POST /api/products error:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}