import { NextRequest, NextResponse } from "next/server";
import db, { withRetry, isAdminRequest } from "@/lib/db";

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = { GET: 120, POST: 30, PUT: 30, DELETE: 15 };

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

// GET /api/categories - List all categories (with cache)
export async function GET(req: NextRequest) {
  const rateLimitError = checkRateLimit(req);
  if (rateLimitError) return rateLimitError;

  try {
    const categories = await withRetry(() =>
      db.category.findMany({
        orderBy: { order: "asc" },
      })
    );
    return NextResponse.json(categories, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

// POST /api/categories - Create a category (admin only)
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const rateLimitError = checkRateLimit(req);
  if (rateLimitError) return rateLimitError;

  try {
    const body = await req.json();
    const category = await withRetry(() =>
      db.category.create({
        data: {
          name: body.name,
          icon: body.icon || "",
          order: body.order || 0,
        },
      })
    );
    return NextResponse.json(category);
  } catch (error) {
    console.error("POST /api/categories error:", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
