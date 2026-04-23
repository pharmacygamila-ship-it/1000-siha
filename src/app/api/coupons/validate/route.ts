import { NextRequest, NextResponse } from "next/server";
import db, { withRetry } from "@/lib/db";

// POST /api/coupons/validate - Validate a coupon code (public)
// Body: { code: string, cartTotal: number, cartItems: [{id, qty}] }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = String(body.code || "").trim().toUpperCase();
    const cartTotal = Number(body.cartTotal) || 0;
    const cartItems: { id: number; qty: number }[] = Array.isArray(body.cartItems) ? body.cartItems : [];

    if (!code) {
      return NextResponse.json({ valid: false, error: "أدخل كود الخصم" }, { status: 400 });
    }

    const coupon = await withRetry(() =>
      db.coupon.findUnique({ where: { code } })
    );

    if (!coupon) {
      return NextResponse.json({ valid: false, error: "كود الخصم غير صالح" });
    }

    if (!coupon.active) {
      return NextResponse.json({ valid: false, error: "كود الخصم غير صالح" });
    }

    // Check expiry
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return NextResponse.json({ valid: false, error: "كود الخصم منتهي الصلاحية" });
    }

    // Check max uses
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ valid: false, error: "تم استخدام هذا الكود الحد الأقصى" });
    }

    // Parse productIds
    let couponProductIds: number[] = [];
    try {
      couponProductIds = JSON.parse(coupon.productIds || "[]");
    } catch {
      couponProductIds = [];
    }

    // Calculate applicable total (only products that match productIds if specified)
    let applicableTotal = cartTotal;
    if (couponProductIds.length > 0 && cartItems.length > 0) {
      // Need to calculate the total of only the applicable products in cart
      const products = await withRetry(() => db.product.findMany({
        where: { id: { in: couponProductIds } },
      }));
      const productMap = new Map(products.map(p => [p.id, p]));
      applicableTotal = 0;
      for (const item of cartItems) {
        if (!couponProductIds.includes(item.id)) continue;
        const product = productMap.get(item.id);
        if (!product) continue;
        const finalPrice = Math.round(product.price * (1 - (product.disc || 0) / 100));
        applicableTotal += finalPrice * item.qty;
      }
      // If no applicable products in cart, coupon can't be applied
      if (applicableTotal === 0) {
        return NextResponse.json({
          valid: false,
          error: "هذا الكوبون لا ينطبق على المنتجات في سلتك",
        });
      }
    }

    // Check minimum order (based on applicable total for product-specific, or cart total for general)
    const minCheckTotal = couponProductIds.length > 0 ? applicableTotal : cartTotal;
    if (coupon.minOrder > 0 && minCheckTotal < coupon.minOrder) {
      return NextResponse.json({
        valid: false,
        error: `الحد الأدنى للطلب ${coupon.minOrder} ج.م`,
        minOrder: coupon.minOrder,
      });
    }

    // Calculate discount based on applicable total
    let discountAmount = 0;
    if (coupon.type === "percentage") {
      discountAmount = Math.round(applicableTotal * (coupon.value / 100));
    } else {
      discountAmount = Math.min(coupon.value, applicableTotal);
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        minOrder: coupon.minOrder,
        productIds: couponProductIds,
        discountAmount,
      },
    });
  } catch (error) {
    console.error("POST /api/coupons/validate error:", error);
    return NextResponse.json({ valid: false, error: "حدث خطأ" }, { status: 500 });
  }
}
