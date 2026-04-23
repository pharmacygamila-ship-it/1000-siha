import { NextRequest, NextResponse } from "next/server";
import db, { withRetry, isAdminRequest } from "@/lib/db";

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = { POST: 5 }; // Only 5 seed calls per minute

function checkRateLimit(req: NextRequest): NextResponse | null {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const key = `${ip}:POST:/api/seed`;
  const now = Date.now();
  const limit = RATE_LIMIT_MAX.POST;

  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return null;
  }
  entry.count++;
  if (entry.count > limit) {
    return NextResponse.json(
      { message: "طلبات كثيرة جداً، حاول بعد دقيقة" },
      { status: 429 }
    );
  }
  return null;
}

// POST /api/seed - Seed the database with default data (only if empty)
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const rateLimitError = checkRateLimit(req);
  if (rateLimitError) return rateLimitError;

  try {
    // Quick check — if products exist, skip immediately (most common case)
    const existingProducts = await db.product.count();
    if (existingProducts > 0) {
      return NextResponse.json({ message: "Database already seeded", count: existingProducts });
    }

    // Seed categories
    const categories = await Promise.all([
      db.category.create({ data: { name: "عناية بالبشرة", icon: "✨", order: 1 } }),
      db.category.create({ data: { name: "حماية من الشمس", icon: "☀️", order: 2 } }),
      db.category.create({ data: { name: "ترطيب", icon: "💧", order: 3 } }),
      db.category.create({ data: { name: "تنظيف", icon: "🧴", order: 4 } }),
      db.category.create({ data: { name: "تفتيح", icon: "🌟", order: 5 } }),
    ]);

    // Seed products
    const products = await Promise.all([
      db.product.create({
        data: {
          name: "فيتارونيك جل كريم 50مل",
          cat: "عناية بالبشرة",
          price: 190,
          disc: 10,
          desc: "تركيبة ذهبية من فيتامين C وحمض الهيالورونيك لترطيب وتفتيح البشرة، مناسب لكل أنواع البشرة",
          tags: JSON.stringify(["#مرطب", "#فيتامينC"]),
          img: "/product1.png",
          images: JSON.stringify([]),
          video: "",
          rating: 4.8,
          reviews: 124,
          sold: 350,
        },
      }),
      db.product.create({
        data: {
          name: "فيتارونيك باد تونر 60 قطعة",
          cat: "عناية بالبشرة",
          price: 190,
          disc: 10,
          desc: "قطعة واحدة يومياً لتنظيف وتنشيط البشرة وإزالة الشوائب بلطف، مناسبة للاستخدام اليومي",
          tags: JSON.stringify(["#باد", "#تونر"]),
          img: "/product2.png",
          images: JSON.stringify([]),
          video: "",
          rating: 4.6,
          reviews: 89,
          sold: 280,
        },
      }),
      db.product.create({
        data: {
          name: "واقي شمس SPF50",
          cat: "حماية من الشمس",
          price: 150,
          disc: 0,
          desc: "حماية يومية خفيفة لا تترك أثراً أبيض، مناسب لكل أنواع البشرة ومقاوم للعرق والماء",
          tags: JSON.stringify(["#SPF50", "#حماية"]),
          img: "/product3.png",
          images: JSON.stringify([]),
          video: "",
          rating: 4.9,
          reviews: 201,
          sold: 520,
        },
      }),
      db.product.create({
        data: {
          name: "سيروم فيتامين C المركز",
          cat: "تفتيح",
          price: 250,
          disc: 15,
          desc: "سيروم مركز لتفتيح البشرة وتوحيد لونها ومكافحة التجاعيد، نتائج ملموسة خلال أسبوعين",
          tags: JSON.stringify(["#تفتيح", "#سيروم"]),
          img: "/product4.png",
          images: JSON.stringify([]),
          video: "",
          rating: 4.7,
          reviews: 156,
          sold: 410,
        },
      }),
      db.product.create({
        data: {
          name: "كريم مرطب بالألوفيرا",
          cat: "ترطيب",
          price: 120,
          disc: 5,
          desc: "مرطب طبيعي خفيف مناسب للبشرة الحساسة، سريع الامتصاص ويرطب طوال اليوم",
          tags: JSON.stringify(["#ترطيب", "#ألوفيرا"]),
          img: "/product5.png",
          images: JSON.stringify([]),
          video: "",
          rating: 4.5,
          reviews: 67,
          sold: 195,
        },
      }),
    ]);

    // Seed default settings
    await withRetry(() =>
      db.siteSettings.upsert({
        where: { id: 1 },
        update: {},
        create: {
          id: 1,
          storeName: "صيدليتي",
          storeLogoLetter: "ص",
          storeLogoUrl: "",
          announcementText: "🚚 توصيل مجاني للطلبات فوق 300 ج.م | 💰 الدفع عند الاستلام فقط — اطمن على المنتج الأولاني وبعدين ادفع! | ⭐ منتجات أصلية 100% | 🔄 استرجاع خلال 7 أيام",
          heroTitle: "منتجات العناية بالبشرة",
          heroSubtitle: "الأصلية 100%",
          heroButtonText: "تسوق الآن ←",
          footerDescription: "منتجات العناية بالبشرة الأصلية 100%. الدفع عند الاستلام فقط عشان تطمن على المنتج الأولاني.",
          footerQuickLinks: JSON.stringify(["المنتجات", "الأكثر مبيعاً", "سياسة الاسترجاع", "الشحن والتوصيل"]),
          facebookUrl: "https://facebook.com/saydaliti",
          facebookLabel: "صفحة صيدليتي على فيسبوك",
          messengerUrl: "https://m.me/saydaliti",
          websiteUrl: "https://saydaliti.com",
          websiteLabel: "زيارة موقعنا",
          copyrightText: "صيدليتي — جميع الحقوق محفوظة",
          layoutWidth: "medium",
          productImageHeight: "medium",
          headerSize: "normal",
          footerSize: "normal",
          mobileViewport: "full",
          mobileZoom: "100",
          mobilePadding: "4",
          mobileCardStyle: "horizontal",
          mobileCardSize: "compact",
          mobileCatStyle: "scroll",
        },
      })
    );

    return NextResponse.json({
      message: "Database seeded successfully",
      products: products.length,
      categories: categories.length,
    });
  } catch (error) {
    console.error("POST /api/seed error:", error);
    return NextResponse.json({ error: "Failed to seed database" }, { status: 500 });
  }
}
