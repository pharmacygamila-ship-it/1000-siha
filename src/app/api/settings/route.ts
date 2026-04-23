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

// GET /api/settings - Get site settings (with cache)
export async function GET(req: NextRequest) {
  const rateLimitError = checkRateLimit(req);
  if (rateLimitError) return rateLimitError;

  try {
    let settings = await withRetry(() =>
      db.siteSettings.findUnique({
        where: { id: 1 },
      })
    );
    if (!settings) {
      settings = await withRetry(() =>
        db.siteSettings.create({
          data: { id: 1 },
        })
      );
    }
    return NextResponse.json(
      {
        ...settings,
        footerQuickLinks: JSON.parse(settings.footerQuickLinks),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

// PUT /api/settings - Update site settings (admin only)
export async function PUT(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const rateLimitError = checkRateLimit(req);
  if (rateLimitError) return rateLimitError;

  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};

    const fields = [
      "storeName", "storeLogoLetter", "storeLogoUrl", "announcementText",
      "heroTitle", "heroSubtitle", "heroButtonText", "heroBadgeText",
      "heroDescLine1", "heroDescLine2",
      "footerDescription",
      "facebookUrl", "facebookLabel", "messengerUrl", "websiteUrl", "websiteLabel",
      "copyrightText", "layoutWidth", "productImageHeight", "headerSize",
      "footerSize", "mobileViewport", "mobileZoom", "mobilePadding",
      "mobileCardStyle", "mobileCardSize", "mobileCatStyle",
      "badgeOriginalText", "badgeCODText", "badgeDeliveryText", "badgeReturnText",
      "advOriginalTitle", "advOriginalDesc", "advCODTitle", "advCODDesc",
      "advDeliveryTitle", "advDeliveryDesc", "advReturnTitle", "advReturnDesc",
      "navHomeText", "navProductsText", "navBestSellingText", "navPolicyText", "navAllProductsText",
      "searchPlaceholder", "sortNewest", "sortPriceLow", "sortPriceHigh", "sortBestSelling",
      "noProductsTitle", "noProductsDesc",
      "cartTitle", "cartEmptyTitle", "cartEmptyDesc", "cartFreeShippingMsg",
      "cartShippingHint", "cartSaveShipping", "cartItemCount", "cartShipping",
      "cartTotal", "cartFreeText", "cartShippingLater", "cartCheckoutBtn",
      "checkoutTitle", "checkoutStepCart", "checkoutStepInfo", "checkoutStepConfirm",
      "checkoutSummaryTitle", "checkoutCODTitle", "checkoutCODDesc",
      "checkoutNameLabel", "checkoutNamePlaceholder", "checkoutPhoneLabel",
      "checkoutGovLabel", "checkoutGovPlaceholder", "checkoutAddrLabel",
      "checkoutAddrPlaceholder", "checkoutNotesLabel", "checkoutNotesPlaceholder",
      "checkoutBackToCart", "checkoutConfirmBtn", "checkoutContinueShopping",
      "errorNameRequired", "errorPhoneRequired", "errorPhoneInvalid",
      "errorGovRequired", "errorAddrRequired",
      "successTitle", "successMsg", "successMsg2", "successMsg3", "successMsg4",
      "successOrderNum", "successPaymentMethod", "successCODLabel",
      "successDeliveryLabel", "successDeliveryTime", "successContactMsg",
      "successContinueBtn",
      "policyPageTitle", "policyBackToStore",
      "policyReturnTitle", "policyReturnContent",
      "policyShippingTitle", "policyShippingContent",
      "policyPaymentTitle", "policyPaymentContent",
      "policyAuthTitle", "policyAuthContent",
      "policyContactTitle", "policyContactContent",
      "productWhyOrderTitle", "productInCartText", "productBuyNowBtn",
      "productRelatedTitle", "productDeliveryTime",
      "productOriginalBadge", "productOriginalSub",
      "productCODSub", "productDeliverySub", "productReturnSub",
      "invoiceTitle", "invoiceOrderNum", "invoiceDate", "invoiceCustomer",
      "invoicePhone", "invoiceAddress", "invoiceProduct", "invoiceQty",
      "invoicePrice", "invoiceTotal", "invoiceShipping",
      "invoiceFreeShipping", "invoiceShippingLater", "invoiceCOD",
      "invoiceFooter", "invoiceOriginalBadge", "invoiceReturnBadge"
    ];

    for (const field of fields) {
      if (body[field] !== undefined) data[field] = body[field];
    }

    if (body.footerQuickLinks !== undefined) {
      data.footerQuickLinks = JSON.stringify(body.footerQuickLinks);
    }

    const settings = await withRetry(() =>
      db.siteSettings.upsert({
        where: { id: 1 },
        update: data,
        create: {
          id: 1,
          ...data,
          footerQuickLinks: data.footerQuickLinks
            ? String(data.footerQuickLinks)
            : "[]",
        },
      })
    );

    return NextResponse.json({
      ...settings,
      footerQuickLinks: JSON.parse(settings.footerQuickLinks),
    });
  } catch (error) {
    console.error("PUT /api/settings error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
