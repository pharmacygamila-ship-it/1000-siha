import { NextRequest, NextResponse } from "next/server";

interface RateLimiterOptions {
  maxRequests?: number;
  windowMs?: number;
}

interface CheckOptions {
  maxRequests?: number;
}

export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(options: RateLimiterOptions = {}) {
    this.maxRequests = options.maxRequests || 60;
    this.windowMs = options.windowMs || 60000;
  }

  check(req: NextRequest, options?: CheckOptions): NextResponse | null {
    const max = options?.maxRequests || this.maxRequests;
    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const now = Date.now();
    const windowStart = now - this.windowMs;

    const requests = this.requests.get(ip) || [];
    const recent = requests.filter((time) => time > windowStart);
    recent.push(now);
    this.requests.set(ip, recent);

    if (recent.length > max) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    return null;
  }
}
