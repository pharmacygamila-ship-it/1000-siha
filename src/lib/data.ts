export interface Product {
  id: number;
  name: string;
  cat: string;
  price: number;
  disc: number;
  desc: string;
  tags: string[];
  img: string;
  images: string[];  // additional product images (real-life photos, etc.)
  video: string;     // product video URL (1:1 square aspect ratio)
  rating: number;
  reviews: number;
  sold: number;
}

export interface CartItem {
  id: number;
  qty: number;
  isGift?: boolean; // true if this item is a free gift
  giftId?: number;  // reference to the Gift record (for auto-removal tracking)
}

export interface Coupon {
  id: number;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minOrder: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  productIds: number[];  // array of product IDs the coupon applies to. Empty = all products
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Gift {
  id: number;
  name: string;
  description: string;
  productId: number;
  minOrder: number;
  triggerProductIds: number[];  // array of product IDs that trigger the gift. Empty = any product
  active: boolean;
  product?: Product;
  createdAt: string;
  updatedAt: string;
}

export interface AppliedCoupon {
  id: number;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minOrder: number;
  productIds: number[];  // carried over from the coupon
  discountAmount: number;
}

export interface Order {
  id: string;
  name: string;
  phone: string;
  gov: string;
  addr: string;
  notes: string;
  items: CartItem[];
  total: number;
  date: string;
  status: "جديد" | "جاري التوصيل" | "تم التسليم";
}

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 1,
    name: "فيتارونيك جل كريم 50مل",
    cat: "عناية بالبشرة",
    price: 190,
    disc: 10,
    desc: "تركيبة ذهبية من فيتامين C وحمض الهيالورونيك لترطيب وتفتيح البشرة، مناسب لكل أنواع البشرة",
    tags: ["#مرطب", "#فيتامينC"],
    img: "/product1.png",
    images: [],
    video: "",
    rating: 4.8,
    reviews: 124,
    sold: 350,
  },
  {
    id: 2,
    name: "فيتارونيك باد تونر 60 قطعة",
    cat: "عناية بالبشرة",
    price: 190,
    disc: 10,
    desc: "قطعة واحدة يومياً لتنظيف وتنشيط البشرة وإزالة الشوائب بلطف، مناسبة للاستخدام اليومي",
    tags: ["#باد", "#تونر"],
    img: "/product2.png",
    images: [],
    video: "",
    rating: 4.6,
    reviews: 89,
    sold: 280,
  },
  {
    id: 3,
    name: "واقي شمس SPF50",
    cat: "حماية من الشمس",
    price: 150,
    disc: 0,
    desc: "حماية يومية خفيفة لا تترك أثراً أبيض، مناسب لكل أنواع البشرة ومقاوم للعرق والماء",
    tags: ["#SPF50", "#حماية"],
    img: "/product3.png",
    images: [],
    video: "",
    rating: 4.9,
    reviews: 201,
    sold: 520,
  },
  {
    id: 4,
    name: "سيروم فيتامين C المركز",
    cat: "تفتيح",
    price: 250,
    disc: 15,
    desc: "سيروم مركز لتفتيح البشرة وتوحيد لونها ومكافحة التجاعيد، نتائج ملموسة خلال أسبوعين",
    tags: ["#تفتيح", "#سيروم"],
    img: "/product4.png",
    images: [],
    video: "",
    rating: 4.7,
    reviews: 156,
    sold: 410,
  },
  {
    id: 5,
    name: "كريم مرطب بالألوفيرا",
    cat: "ترطيب",
    price: 120,
    disc: 5,
    desc: "مرطب طبيعي خفيف مناسب للبشرة الحساسة، سريع الامتصاص ويرطب طوال اليوم",
    tags: ["#ترطيب", "#ألوفيرا"],
    img: "/product5.png",
    images: [],
    video: "",
    rating: 4.5,
    reviews: 67,
    sold: 195,
  },
];

export interface Category {
  id: number;
  name: string;
  icon: string;
  order: number;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 1, name: "عناية بالبشرة", icon: "✨", order: 1 },
  { id: 2, name: "حماية من الشمس", icon: "☀️", order: 2 },
  { id: 3, name: "ترطيب", icon: "💧", order: 3 },
  { id: 4, name: "تنظيف", icon: "🧴", order: 4 },
  { id: 5, name: "تفتيح", icon: "🌟", order: 5 },
];

export const EGYPTIAN_GOVERNORATES = [
  "القاهرة",
  "الجيزة",
  "الإسكندرية",
  "الشرقية",
  "الدقهلية",
  "البحيرة",
  "المنيا",
  "الغربية",
  "المنوفية",
  "القليوبية",
  "سوهاج",
  "أسيوط",
  "الفيوم",
  "بني سويف",
  "كفر الشيخ",
  "دمياط",
  "بورسعيد",
  "الإسماعيلية",
  "السويس",
  "الأقصر",
  "أسوان",
  "قنا",
  "مطروح",
  "البحر الأحمر",
  "الوادي الجديد",
  "شمال سيناء",
  "جنوب سيناء",
];

export function calcFinalPrice(price: number, disc: number): number {
  return Math.round(price * (1 - (disc || 0) / 100));
}

export function formatPrice(price: number): string {
  return price.toLocaleString("ar-EG");
}

export interface SiteSettings {
  storeName: string;
  storeLogoLetter: string;
  storeLogoUrl: string;
  announcementText: string;
  heroTitle: string;
  heroSubtitle: string;
  heroButtonText: string;
  heroBadgeText: string;
  heroDescLine1: string;
  heroDescLine2: string;
  footerDescription: string;
  footerQuickLinks: string[];
  facebookUrl: string;
  facebookLabel: string;
  messengerUrl: string;
  websiteUrl: string;
  websiteLabel: string;
  copyrightText: string;
  layoutWidth: "narrow" | "medium" | "wide" | "full";
  productImageHeight: "small" | "medium" | "large";
  headerSize: "compact" | "normal" | "large";
  footerSize: "compact" | "normal" | "large";
  mobileViewport: "full" | "padded" | "card" | "compact";
  mobileZoom: "75" | "85" | "100" | "110" | "120";
  mobilePadding: "0" | "4" | "8" | "12" | "16";
  mobileCardStyle: "horizontal" | "vertical" | "grid";
  mobileCardSize: "compact" | "normal" | "large";
  mobileCatStyle: "scroll" | "wrap" | "grid";
  // Trust Badges
  badgeOriginalText: string;
  badgeCODText: string;
  badgeDeliveryText: string;
  badgeReturnText: string;
  // Advantages
  advOriginalTitle: string;
  advOriginalDesc: string;
  advCODTitle: string;
  advCODDesc: string;
  advDeliveryTitle: string;
  advDeliveryDesc: string;
  advReturnTitle: string;
  advReturnDesc: string;
  // Navigation
  navHomeText: string;
  navProductsText: string;
  navBestSellingText: string;
  navPolicyText: string;
  navAllProductsText: string;
  // Search & Sort
  searchPlaceholder: string;
  sortNewest: string;
  sortPriceLow: string;
  sortPriceHigh: string;
  sortBestSelling: string;
  noProductsTitle: string;
  noProductsDesc: string;
  // Cart
  cartTitle: string;
  cartEmptyTitle: string;
  cartEmptyDesc: string;
  cartFreeShippingMsg: string;
  cartShippingHint: string;
  cartSaveShipping: string;
  cartItemCount: string;
  cartShipping: string;
  cartTotal: string;
  cartFreeText: string;
  cartShippingLater: string;
  cartCheckoutBtn: string;
  // Checkout
  checkoutTitle: string;
  checkoutStepCart: string;
  checkoutStepInfo: string;
  checkoutStepConfirm: string;
  checkoutSummaryTitle: string;
  checkoutCODTitle: string;
  checkoutCODDesc: string;
  checkoutNameLabel: string;
  checkoutNamePlaceholder: string;
  checkoutPhoneLabel: string;
  checkoutGovLabel: string;
  checkoutGovPlaceholder: string;
  checkoutAddrLabel: string;
  checkoutAddrPlaceholder: string;
  checkoutNotesLabel: string;
  checkoutNotesPlaceholder: string;
  checkoutBackToCart: string;
  checkoutConfirmBtn: string;
  checkoutContinueShopping: string;
  // Validation Errors
  errorNameRequired: string;
  errorPhoneRequired: string;
  errorPhoneInvalid: string;
  errorGovRequired: string;
  errorAddrRequired: string;
  // Success Page
  successTitle: string;
  successMsg: string;
  successMsg2: string;
  successMsg3: string;
  successMsg4: string;
  successOrderNum: string;
  successPaymentMethod: string;
  successCODLabel: string;
  successDeliveryLabel: string;
  successDeliveryTime: string;
  successContactMsg: string;
  successContinueBtn: string;
  // Policy Page
  policyPageTitle: string;
  policyBackToStore: string;
  policyReturnTitle: string;
  policyReturnContent: string;
  policyShippingTitle: string;
  policyShippingContent: string;
  policyPaymentTitle: string;
  policyPaymentContent: string;
  policyAuthTitle: string;
  policyAuthContent: string;
  policyContactTitle: string;
  policyContactContent: string;
  // Product Detail
  productWhyOrderTitle: string;
  productInCartText: string;
  productBuyNowBtn: string;
  productRelatedTitle: string;
  productDeliveryTime: string;
  productOriginalBadge: string;
  productOriginalSub: string;
  productCODSub: string;
  productDeliverySub: string;
  productReturnSub: string;
  // Invoice
  invoiceTitle: string;
  invoiceOrderNum: string;
  invoiceDate: string;
  invoiceCustomer: string;
  invoicePhone: string;
  invoiceAddress: string;
  invoiceProduct: string;
  invoiceQty: string;
  invoicePrice: string;
  invoiceTotal: string;
  invoiceShipping: string;
  invoiceFreeShipping: string;
  invoiceShippingLater: string;
  invoiceCOD: string;
  invoiceFooter: string;
  invoiceOriginalBadge: string;
  invoiceReturnBadge: string;
  // Coupon & Gift Texts
  couponPlaceholder: string;
  couponApplyBtn: string;
  couponInvalidMsg: string;
  couponExpiredMsg: string;
  couponMinOrderMsg: string;
  couponMaxUsesMsg: string;
  couponAppliedMsg: string;
  couponDiscountLabel: string;
  giftLabel: string;
  giftMinOrderMsg: string;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  storeName: "صيدليتي",
  storeLogoLetter: "ص",
  storeLogoUrl: "",
  announcementText:
    "🚚 توصيل مجاني للطلبات فوق 300 ج.م | 💰 الدفع عند الاستلام فقط — اطمن على المنتج الأولاني وبعدين ادفع! | ⭐ منتجات أصلية 100% | 🔄 استرجاع خلال 7 أيام",
  heroTitle: "منتجات العناية بالبشرة",
  heroSubtitle: "الأصلية 100%",
  heroButtonText: "تسوق الآن ←",
  heroBadgeText: "✦ منتجات أصلية مضمونة ✦",
  heroDescLine1: "منتجات أصلية مضمونة — الدفع عند الاستلام فقط",
  heroDescLine2: "اطلب واطمن على المنتج الأولاني وبعدين ادفع!",
  footerDescription:
    "منتجات العناية بالبشرة الأصلية 100%. الدفع عند الاستلام فقط عشان تطمن على المنتج الأولاني.",
  footerQuickLinks: ["المنتجات", "الأكثر مبيعاً", "سياسة الاسترجاع", "الشحن والتوصيل"],
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
  // Trust Badges
  badgeOriginalText: "منتجات أصلية",
  badgeCODText: "دفع عند الاستلام",
  badgeDeliveryText: "توصيل سريع مجاناً",
  badgeReturnText: "استرجاع 7 أيام",
  // Advantages
  advOriginalTitle: "منتجات أصلية",
  advOriginalDesc: "مضمونة 100% من مصادر موثوقة",
  advCODTitle: "دفع عند الاستلام",
  advCODDesc: "اطمن الأول وبعدين ادفع",
  advDeliveryTitle: "توصيل سريع مجاناً",
  advDeliveryDesc: "للطلبات فوق 300 ج.م",
  advReturnTitle: "استرجاع 7 أيام",
  advReturnDesc: "لو مش أصلي هنجيب فلوسك",
  // Navigation
  navHomeText: "الرئيسية",
  navProductsText: "المنتجات",
  navBestSellingText: "الأكثر مبيعاً",
  navPolicyText: "سياسة الاسترجاع",
  navAllProductsText: "كل المنتجات",
  // Search & Sort
  searchPlaceholder: "ابحث عن منتج...",
  sortNewest: "الأحدث",
  sortPriceLow: "السعر: من الأقل",
  sortPriceHigh: "السعر: من الأعلى",
  sortBestSelling: "الأكثر مبيعاً",
  noProductsTitle: "لا توجد منتجات مطابقة",
  noProductsDesc: "جرب كلمات بحث أخرى أو غير التصنيف",
  // Cart
  cartTitle: "سلة التسوق",
  cartEmptyTitle: "السلة فارغة",
  cartEmptyDesc: "أضف منتجات من الكتالوج",
  cartFreeShippingMsg: "واو! عندك توصيل مجاني",
  cartShippingHint: "أضف منتجات بـ",
  cartSaveShipping: "ووفر مصاريف الشحن",
  cartItemCount: "عدد المنتجات",
  cartShipping: "الشحن",
  cartTotal: "الإجمالي",
  cartFreeText: "مجاني",
  cartShippingLater: "يُحدد لاحقاً",
  cartCheckoutBtn: "إتمام الطلب ←",
  // Checkout
  checkoutTitle: "بيانات الطلب",
  checkoutStepCart: "السلة",
  checkoutStepInfo: "البيانات",
  checkoutStepConfirm: "التأكيد",
  checkoutSummaryTitle: "ملخص الطلب",
  checkoutCODTitle: "الدفع عند الاستلام فقط",
  checkoutCODDesc: "هتستلم المنتج وتتأكد إنه أصلي وبعدين تدفع — مفيش أي مخاطرة!",
  checkoutNameLabel: "الاسم الكامل",
  checkoutNamePlaceholder: "مثال: محمد أحمد",
  checkoutPhoneLabel: "رقم التليفون",
  checkoutGovLabel: "المحافظة",
  checkoutGovPlaceholder: "اختار المحافظة",
  checkoutAddrLabel: "العنوان بالتفصيل",
  checkoutAddrPlaceholder: "الحي، الشارع، رقم العمارة...",
  checkoutNotesLabel: "ملاحظات (اختياري)",
  checkoutNotesPlaceholder: "أي طلبات خاصة...",
  checkoutBackToCart: "رجوع للسلة",
  checkoutConfirmBtn: "تأكيد الطلب",
  checkoutContinueShopping: "متابعة التسوق",
  // Validation Errors
  errorNameRequired: "الاسم مطلوب",
  errorPhoneRequired: "رقم التليفون مطلوب",
  errorPhoneInvalid: "رقم التليفون مش صحيح (01xxxxxxxxx)",
  errorGovRequired: "اختار المحافظة",
  errorAddrRequired: "العنوان مطلوب",
  // Success Page
  successTitle: "تم استلام طلبك!",
  successMsg: "شكراً",
  successMsg2: "! طلبك رقم",
  successMsg3: "اتسجل بنجاح.",
  successMsg4: "هنتواصل معاك على التليفون لتأكيد الطلب ومواعيد التوصيل.",
  successOrderNum: "رقم الطلب",
  successPaymentMethod: "طريقة الدفع",
  successCODLabel: "الدفع عند الاستلام",
  successDeliveryLabel: "التوصيل",
  successDeliveryTime: "خلال 4 أيام",
  successContactMsg: "تقدر تتواصل معانا على صفحتنا على فيسبوك",
  successContinueBtn: "متابعة التسوق",
  // Policy Page
  policyPageTitle: "سياسة الاسترجاع والشحن",
  policyBackToStore: "الرجوع للمتجر",
  policyReturnTitle: "سياسة الاسترجاع",
  policyReturnContent: "تقدر ترجع المنتج خلال 7 أيام من استلامه لو مش أصلي أو فيه عيب صناعي. المنتج لازم يكون في حالته الأصلية بدون استخدام. هنستلم المنتج منك ونرجعلك فلوسك فوراً.",
  policyShippingTitle: "الشحن والتوصيل",
  policyShippingContent: "التوصيل خلال 4 أيام حسب المحافظة. التوصيل مجاني للطلبات فوق 300 ج.م. للطلبات تحت 300 ج.م مصاريف الشحن بتحدد حسب المحافظة وبتتضاف عند التوصيل.",
  policyPaymentTitle: "طرق الدفع",
  policyPaymentContent: "الدفع عند الاستلام فقط — مفيش أي دفع إلكتروني أو تحويل بنكي. استلم المنتج، اتأكد إنه أصلي وبعدين ادفع لمندوب التوصيل. ده عشان نحافظ على ثقتك واطمئنانك.",
  policyAuthTitle: "ضمان الأصالة",
  policyAuthContent: "كل منتجاتنا أصلية 100% ومن مصادر موثوقة. لو لا قيت المنتج مش أصلي، ترجعه واحنا نرجعلك فلوسك كاملة زي ما وعدناك.",
  policyContactTitle: "التواصل والدعم",
  policyContactContent: "لو عندك أي سؤال أو مشكلة، تواصل معانا على صفحتنا على فيسبوك 'صيدليتي' أو زور موقعنا. فريقنا موجود لمساعدتك في أي وقت.",
  // Product Detail
  productWhyOrderTitle: "لماذا تطلب من صيدليتي؟",
  productInCartText: "في السلة",
  productBuyNowBtn: "شراء الآن",
  productRelatedTitle: "منتجات مشابهة",
  productDeliveryTime: "خلال 4 أيام",
  productOriginalBadge: "منتجات أصلية 100%",
  productOriginalSub: "مضمونة من مصادر موثوقة",
  productCODSub: "اطمن الأول وبعدين ادفع",
  productDeliverySub: "خلال 4 أيام",
  productReturnSub: "لو مش أصلي هنجيب فلوسك",
  // Invoice
  invoiceTitle: "فاتورة",
  invoiceOrderNum: "رقم الطلب",
  invoiceDate: "التاريخ",
  invoiceCustomer: "العميل",
  invoicePhone: "التليفون",
  invoiceAddress: "العنوان",
  invoiceProduct: "المنتج",
  invoiceQty: "الكمية",
  invoicePrice: "السعر",
  invoiceTotal: "الإجمالي",
  invoiceShipping: "الشحن",
  invoiceFreeShipping: "مجاني",
  invoiceShippingLater: "يحدد لاحقاً",
  invoiceCOD: "الدفع عند الاستلام",
  invoiceFooter: "شكراً لتسوقكم من",
  invoiceOriginalBadge: "منتجات أصلية 100%",
  invoiceReturnBadge: "استرجاع خلال 7 أيام",
  // Coupon & Gift Texts
  couponPlaceholder: "أدخل كود الخصم",
  couponApplyBtn: "تطبيق",
  couponInvalidMsg: "كود الخصم غير صالح",
  couponExpiredMsg: "كود الخصم منتهي الصلاحية",
  couponMinOrderMsg: "الحد الأدنى للطلب",
  couponMaxUsesMsg: "تم استخدام هذا الكود الحد الأقصى",
  couponAppliedMsg: "تم تطبيق الخصم!",
  couponDiscountLabel: "الخصم",
  giftLabel: "هدية مجانية!",
  giftMinOrderMsg: "أضف منتجات بـ",
};

export const ADMIN_PASSWORD = "307524";

export function getLayoutMaxWidth(width: SiteSettings["layoutWidth"]): string {
  switch (width) {
    case "narrow": return "max-w-3xl";    // 768px
    case "medium": return "max-w-5xl";    // 1024px
    case "wide": return "max-w-6xl";      // 1152px
    case "full": return "max-w-full";     // full width
    default: return "max-w-5xl";
  }
}

export function getProductImageHeight(height: SiteSettings["productImageHeight"]): string {
  switch (height) {
    case "small": return "sm:w-[160px] md:w-[180px] min-h-[160px] sm:min-h-[200px]";
    case "medium": return "sm:w-[200px] md:w-[220px] min-h-[200px] sm:min-h-[240px]";
    case "large": return "sm:w-[260px] md:w-[300px] min-h-[240px] sm:min-h-[300px]";
    default: return "sm:w-[200px] md:w-[220px] min-h-[200px] sm:min-h-[240px]";
  }
}

export function getHeaderSize(size: SiteSettings["headerSize"]): { wrapper: string; logo: string; text: string; nav: string; cart: string } {
  switch (size) {
    case "compact":
      return {
        wrapper: "py-1.5",
        logo: "w-7 h-7 text-sm",
        text: "text-sm",
        nav: "text-xs px-2 py-1",
        cart: "p-1.5",
      };
    case "normal":
      return {
        wrapper: "py-3",
        logo: "w-9 h-9 text-lg",
        text: "text-lg",
        nav: "text-sm px-3 py-1.5",
        cart: "p-2",
      };
    case "large":
      return {
        wrapper: "py-4",
        logo: "w-12 h-12 text-xl",
        text: "text-xl",
        nav: "text-base px-4 py-2",
        cart: "p-3",
      };
    default:
      return {
        wrapper: "py-3",
        logo: "w-9 h-9 text-lg",
        text: "text-lg",
        nav: "text-sm px-3 py-1.5",
        cart: "p-2",
      };
  }
}

export function getFooterSize(size: SiteSettings["footerSize"]): { wrapper: string; logo: string; title: string; gap: string } {
  switch (size) {
    case "compact":
      return {
        wrapper: "py-5",
        logo: "w-6 h-6 text-xs",
        title: "text-sm",
        gap: "gap-4",
      };
    case "normal":
      return {
        wrapper: "py-10",
        logo: "w-8 h-8 text-sm",
        title: "text-lg",
        gap: "gap-8",
      };
    case "large":
      return {
        wrapper: "py-16",
        logo: "w-10 h-10 text-base",
        title: "text-xl",
        gap: "gap-10",
      };
    default:
      return {
        wrapper: "py-10",
        logo: "w-8 h-8 text-sm",
        title: "text-lg",
        gap: "gap-8",
      };
  }
}

export function getMobileViewportStyle(viewport: SiteSettings["mobileViewport"], padding: SiteSettings["mobilePadding"]): { wrapper: string; container: string } {
  const pad = `p-${padding}`;
  switch (viewport) {
    case "full":
      return {
        wrapper: `w-full ${pad}`,
        container: "w-full",
      };
    case "padded":
      return {
        wrapper: `w-full ${pad}`,
        container: "max-w-lg mx-auto",
      };
    case "card":
      return {
        wrapper: `w-full ${pad}`,
        container: "max-w-sm mx-auto",
      };
    case "compact":
      return {
        wrapper: `w-full ${pad}`,
        container: "max-w-xs mx-auto",
      };
    default:
      return {
        wrapper: `w-full ${pad}`,
        container: "w-full",
      };
  }
}

export function getMobileCardClasses(style: SiteSettings["mobileCardStyle"], size: SiteSettings["mobileCardSize"]): {
  imageClass: string;
  infoClass: string;
  nameClass: string;
  descClass: string;
  priceClass: string;
  wrapperClass: string;
  tagsHide: boolean;
  ratingHide: boolean;
} {
  const sizeScale = size === "compact" ? "sm" : size === "normal" ? "md" : "lg";
  
  switch (style) {
    case "horizontal":
      return {
        imageClass: size === "compact" ? "w-[80px] min-h-[80px]" : size === "normal" ? "w-[100px] min-h-[100px]" : "w-[120px] min-h-[120px]",
        infoClass: size === "compact" ? "p-2 gap-0.5" : size === "normal" ? "p-3 gap-1.5" : "p-4 gap-2",
        nameClass: size === "compact" ? "text-sm" : size === "normal" ? "text-base" : "text-lg",
        descClass: size === "compact" ? "text-[10px]" : "text-xs",
        priceClass: size === "compact" ? "text-sm" : size === "normal" ? "text-base" : "text-lg",
        wrapperClass: size === "compact" ? "rounded-2xl" : "rounded-3xl",
        tagsHide: size === "compact",
        ratingHide: size === "compact",
      };
    case "vertical":
      return {
        imageClass: size === "compact" ? "w-full min-h-[110px]" : size === "normal" ? "w-full min-h-[160px]" : "w-full min-h-[200px]",
        infoClass: size === "compact" ? "p-2.5 gap-0.5" : size === "normal" ? "p-4 gap-1.5" : "p-5 gap-2",
        nameClass: size === "compact" ? "text-sm" : size === "normal" ? "text-base" : "text-lg",
        descClass: size === "compact" ? "text-[10px]" : "text-xs",
        priceClass: size === "compact" ? "text-base" : size === "normal" ? "text-lg" : "text-xl",
        wrapperClass: size === "compact" ? "rounded-2xl" : "rounded-3xl",
        tagsHide: false,
        ratingHide: size === "compact",
      };
    case "grid":
      return {
        imageClass: size === "compact" ? "w-full min-h-[80px]" : size === "normal" ? "w-full min-h-[100px]" : "w-full min-h-[130px]",
        infoClass: size === "compact" ? "p-1.5 gap-0.5" : size === "normal" ? "p-2 gap-1" : "p-3 gap-1.5",
        nameClass: size === "compact" ? "text-[11px]" : size === "normal" ? "text-sm" : "text-base",
        descClass: "text-[9px]",
        priceClass: size === "compact" ? "text-xs" : size === "normal" ? "text-sm" : "text-base",
        wrapperClass: "rounded-2xl",
        tagsHide: true,
        ratingHide: true,
      };
    default:
      return {
        imageClass: "w-[100px] min-h-[100px]",
        infoClass: "p-3 gap-1.5",
        nameClass: "text-sm",
        descClass: "text-[10px]",
        priceClass: "text-sm",
        wrapperClass: "rounded-2xl",
        tagsHide: true,
        ratingHide: true,
      };
  }
}

export function getMobileZoomScale(zoom: SiteSettings["mobileZoom"]): number {
  switch (zoom) {
    case "75": return 0.75;
    case "85": return 0.85;
    case "100": return 1;
    case "110": return 1.1;
    case "120": return 1.2;
    default: return 1;
  }
}

export function escapeHtml(str: string): string {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

export function isMobileView(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 640;
}
