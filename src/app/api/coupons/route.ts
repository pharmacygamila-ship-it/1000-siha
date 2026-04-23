import { NextRequest, NextResponse } from "next/server";
import db, { withRetry, isAdminRequest } from "@/lib/db";

// Simple rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = { GET: 60, POST: 10 };

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetTime + RATE_LIMIT_WINDOW) rateLimitMap.delete(key);
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
    return NextResponse.json({ error: "طلبات كثيرة جداً" }, { status: 429 });
  }
  return null;
}

// GET /api/coupons - List all coupons
export async function GET(req: NextRequest) {
  const rateLimitError = checkRateLimit(req);
  if (rateLimitError) return rateLimitError;

  try {
    const coupons = await withRetry(() =>
      db.coupon.findMany({ orderBy: { createdAt: "desc" } })
    );
    // Parse productIds in response for client consumption
    const parsed = coupons.map((c) => ({
      ...c,
      productIds: (() => {
        try { return Array.isArray(c.productIds) ? c.productIds : JSON.parse(c.productIds || "[]"); }
        catch { return []; }
      })(),
    }));
    return NextResponse.json(parsed, {
      headers: { "Cache-Control": "private, s-maxage=10" },
    });
  } catch (error) {
    console.error("GET /api/coupons error:", error);
    return NextResponse.json({ error: "Failed to fetch coupons" }, { status: 500 });
  }
}

// POST /api/coupons - Create a coupon (admin only)
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const rateLimitError = checkRateLimit(req);
  if (rateLimitError) return rateLimitError;

  try {
    const body = await req.json();

    if (!body.code?.trim()) {
      return NextResponse.json({ error: "كود الخصم مطلوب" }, { status: 400 });
    }

    const code = String(body.code).trim().toUpperCase();

    // Check if code already exists
    const existing = await db.coupon.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: "هذا الكود موجود بالفعل" }, { status: 400 });
    }

    const coupon = await withRetry(() =>
      db.coupon.create({
        data: {
          code,
          type: body.type === "fixed" ? "fixed" : "percentage",
          value: Number(body.value) || 0,
          minOrder: Number(body.minOrder) || 0,
          maxUses: Number(body.maxUses) || 0,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
          productIds: JSON.stringify(Array.isArray(body.productIds) ? body.productIds : []),
          active: body.active !== false,
        },
      })
    );

    return NextResponse.json(coupon, { status: 201 });
  } catch (error) {
    console.error("POST /api/coupons error:", error);
    return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 });
  }
}
