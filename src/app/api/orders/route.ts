import { NextRequest, NextResponse } from "next/server";
import db, { withRetry, isAdminRequest } from "@/lib/db";

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = { GET: 60, POST: 10, PUT: 30, DELETE: 15 };

// Cleanup old entries every 2 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetTime + RATE_LIMIT_WINDOW) {
      rateLimitMap.delete(key);
    }
  }
}, 120_000);

function checkRateLimit(req: NextRequest): NextResponse | null {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const method = req.method as keyof typeof RATE_LIMIT_MAX;
  const key = `${ip}:${method}:${req.nextUrl.pathname}`;
  const now = Date.now();
  const limit = RATE_LIMIT_MAX[method] || 60;

  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return null;
  }
  entry.count++;
  if (entry.count > limit) {
    return NextResponse.json(
      { error: "طلبات كثيرة جداً، حاول بعد دقيقة" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((entry.resetTime - now) / 1000)) } }
    );
  }
  return null;
}

// GET /api/orders - List all orders (admin only - contains PII)
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const rateLimitError = checkRateLimit(req);
  if (rateLimitError) return rateLimitError;

  try {
    const orders = await withRetry(() =>
      db.order.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      })
    );
    // Transform to match frontend Order type
    const transformed = orders.map((order) => ({
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
    }));
    return NextResponse.json(transformed, {
      headers: {
        "Cache-Control": "private, s-maxage=10, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

// POST /api/orders - Create an order (most critical for high traffic)
export async function POST(req: NextRequest) {
  const rateLimitError = checkRateLimit(req);
  if (rateLimitError) return rateLimitError;

  try {
    const body = await req.json();

    // Validate required fields
    if (!body.name || !body.phone || !body.gov || !body.addr || !body.items?.length) {
      return NextResponse.json({ error: "بيانات الطلب غير مكتملة" }, { status: 400 });
    }

    // Validate phone format (Egyptian mobile)
    const phone = String(body.phone).trim();
    if (!/^01[0-9]{9}$/.test(phone)) {
      return NextResponse.json({ error: "رقم التليفون مش صحيح" }, { status: 400 });
    }

    // Sanitize string inputs — strip HTML tags to prevent XSS
    const sanitize = (str: string) => String(str).trim().replace(/<[^>]*>/g, "");

    // Generate collision-resistant order ID if not provided
    const orderId = body.id || `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const order = await withRetry(() =>
      db.order.create({
        data: {
          id: orderId,
          name: sanitize(body.name),
          phone,
          gov: sanitize(body.gov),
          addr: sanitize(body.addr),
          notes: sanitize(body.notes || ""),
          total: Number(body.total) || 0,
          status: "جديد",
          items: {
            create: (body.items as { id: number; qty: number }[]).map((item) => ({
              productId: Number(item.id),
              qty: Math.max(1, Number(item.qty) || 1),
            })),
          },
        },
        include: {
          items: true,
        },
      })
    );

    // Increment coupon usedCount if a coupon was applied
    if (body.couponId) {
      try {
        await withRetry(() =>
          db.coupon.update({
            where: { id: Number(body.couponId) },
            data: { usedCount: { increment: 1 } },
          })
        );
      } catch {
        // Non-critical: don't fail order if coupon update fails
      }
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("POST /api/orders error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
