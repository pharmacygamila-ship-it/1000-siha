"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
// framer-motion removed — all animations use CSS only
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Search,
  Star,
  Truck,
  Shield,
  CheckCircle,
  Phone,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  X,
  Settings,
  Package,
  ClipboardList,
  Edit,
  Trash,
  Upload,
  Facebook,
  MessageCircle,
  Globe,
  ArrowRight,
  ArrowLeft,
  BadgePercent,
  Clock,
  Heart,
  Eye,
  Store,
  CreditCard,
  RotateCcw,
  Info,
  FolderPlus,
  Folder,
  GripVertical,
  Download,
  Printer,
  FileText,
  Smartphone,
  ZoomIn,
  Maximize,
  Menu,
  Type,
  Award,
  AlertCircle,
  Gift as GiftIcon,
  Tag,
  Copy,
  EyeOff,
  ImagePlus,
  Camera,
  Video,
  Play,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
// html2canvas loaded dynamically to reduce bundle size
import { useShopStore } from "@/lib/store";
import {
  DEFAULT_PRODUCTS,
  DEFAULT_CATEGORIES,
  DEFAULT_SITE_SETTINGS,
  EGYPTIAN_GOVERNORATES,
  ADMIN_PASSWORD,
  calcFinalPrice,
  formatPrice,
  getLayoutMaxWidth,
  getProductImageHeight,
  getHeaderSize,
  getFooterSize,
  getMobileViewportStyle,
  getMobileZoomScale,
  getMobileCardClasses,
  isMobileView,
  type Product,
  type Order,
  type Category,
  type SiteSettings,
  type CartItem,
  type Coupon,
  type Gift,
  type AppliedCoupon,
} from "@/lib/data";

/* ─── Cart Flash Toast (Global) ─── */
let _cartToastTimeout: NodeJS.Timeout | null = null;
let _cartToastSetState: ((s: { show: boolean; exiting: boolean; productName: string }) => void) | null = null;

function showCartFlash(productName: string) {
  if (_cartToastSetState) {
    _cartToastSetState({ show: true, exiting: false, productName });
    if (_cartToastTimeout) clearTimeout(_cartToastTimeout);
    _cartToastTimeout = setTimeout(() => {
      _cartToastSetState?.({ show: true, exiting: true, productName });
      setTimeout(() => {
        _cartToastSetState?.({ show: false, exiting: false, productName: "" });
      }, 380);
    }, 1800);
  }
}

function CartFlashToast() {
  const [state, setState] = useState<{ show: boolean; exiting: boolean; productName: string }>({
    show: false,
    exiting: false,
    productName: "",
  });

  useEffect(() => {
    _cartToastSetState = setState;
    return () => { _cartToastSetState = null; };
  }, []);

  if (!state.show) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
      <div
        className={`
          relative overflow-hidden
          bg-gradient-to-l from-[#F07800] to-[#C85A00]
          text-white px-6 py-3 rounded-2xl shadow-xl shadow-[#F07800]/30
          flex items-center gap-3 min-w-[220px] max-w-[90vw]
          ${state.exiting ? "cart-toast-exit" : "cart-toast-enter cart-toast-shine"}
        `}
      >
        {/* Check icon with bounce */}
        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
          <CheckCircle size={18} className="text-white" />
        </div>
        {/* Product name & message */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white/80">تمت الإضافة للسلة</p>
          <p className="text-sm font-bold truncate">{state.productName}</p>
        </div>
        {/* Cart icon */}
        <ShoppingCart size={16} className="text-white/70 flex-shrink-0" />
      </div>
    </div>
  );
}

/* ─── Scroll to Top Button ─── */
function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 400) {
        setVisible(true);
        setExiting(false);
      } else if (visible) {
        setExiting(true);
        setTimeout(() => setVisible(false), 260);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [visible]);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`fixed bottom-20 right-5 z-50 w-11 h-11 rounded-full bg-gradient-to-bl from-[#F07800] to-[#C85A00] text-white shadow-xl shadow-[#F07800]/25 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform ${exiting ? "scroll-top-exit" : "scroll-top-enter"}`}
      aria-label="العودة للأعلى"
    >
      <ChevronUp size={20} strokeWidth={2.5} />
    </button>
  );
}

/* ─── Confetti Effect ─── */
function ConfettiEffect() {
  const colors = ["#F07800", "#F5C400", "#FFD700", "#2d8a4e", "#EAF3DE", "#FF6B6B", "#4ECDC4"];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            left: `${Math.random() * 100}%`,
            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
            animationDuration: `${2 + Math.random() * 3}s`,
            animationDelay: `${Math.random() * 1.5}s`,
            width: `${6 + Math.random() * 6}px`,
            height: `${6 + Math.random() * 6}px`,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Star Rating ─── */
function StarRating({ rating, reviews }: { rating: number; reviews: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={12}
          className={
            s <= Math.round(rating)
              ? "fill-amber-400 text-amber-400 drop-shadow-sm"
              : "text-gray-300"
          }
        />
      ))}
      <span className="text-[11px] text-muted-foreground mr-1 font-medium">
        ({reviews})
      </span>
    </div>
  );
}

/* ─── Announcement Bar ─── */
function AnnouncementBar() {
  const { siteSettings } = useShopStore();
  const text = siteSettings.announcementText || DEFAULT_SITE_SETTINGS.announcementText;
  // Split by | and repeat for marquee
  const parts = text.split("|").map((s) => s.trim()).filter(Boolean);
  const marqueeText = [...parts, ...parts].join("     ✦     ");
  return (
    <div className="relative bg-gradient-to-l from-[#C85A00] via-[#F07800] to-[#F5C400] text-white py-1.5 sm:py-2.5 overflow-hidden">
      {/* Luxury shimmer overlay */}
      <div className="absolute inset-0 animate-shimmer pointer-events-none" />
      <div className="animate-marquee-rtl whitespace-nowrap text-sm font-medium tracking-wide">
        {marqueeText}
      </div>
    </div>
  );
}

/* ─── Header ─── */
function Header() {
  const { cart, setCartOpen, setCurrentView, siteSettings, isAdminUnlocked, setAdminUnlocked, setAdminTab, categories, setSelectedCategory, setSelectedProductId } = useShopStore();
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const [logoClicks, setLogoClicks] = useState(0);
  const logoClickTimer = useRef<NodeJS.Timeout | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const catDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target as Node)) {
        setCatDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on navigation
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  const handleLogoClick = useCallback(() => {
    // Normal click: go to catalog
    useShopStore.getState().navigateTo("catalog");
    // Secret: count rapid clicks for admin access
    const newCount = logoClicks + 1;
    setLogoClicks(newCount);
    if (logoClickTimer.current) clearTimeout(logoClickTimer.current);
    logoClickTimer.current = setTimeout(() => setLogoClicks(0), 1500);
    if (newCount >= 5) {
      setLogoClicks(0);
      if (isAdminUnlocked) {
        setAdminTab("appearance");
        useShopStore.getState().navigateTo("admin");
      }
      // If not unlocked, the PasswordDialog will be shown from main component
      // We use a custom event to trigger it
      window.dispatchEvent(new CustomEvent("show-admin-login"));
    }
  }, [logoClicks, setCurrentView, isAdminUnlocked, setAdminTab]);

  const hs = getHeaderSize(siteSettings.headerSize);

  const navItems = [
    { label: siteSettings.navHomeText || "الرئيسية", view: "catalog" as const, icon: <Store size={16} />, scrollToTop: true },
    { label: siteSettings.navProductsText || "المنتجات", view: "catalog" as const, icon: <Package size={16} />, scrollToProducts: true },
    { label: siteSettings.navBestSellingText || "الأكثر مبيعاً", view: "catalog" as const, icon: <BadgePercent size={16} />, sortBestSelling: true },
    { label: siteSettings.navPolicyText || "سياسة الاسترجاع", view: "policy" as const, icon: <RotateCcw size={16} /> },
  ];

  const handleNavClick = (item: typeof navItems[number]) => {
    setMobileMenuOpen(false);
    setCatDropdownOpen(false);
    if (item.view === "policy") {
      useShopStore.getState().navigateTo("policy");
    } else if (item.sortBestSelling) {
      setSelectedCategory(siteSettings.navAllProductsText || "كل المنتجات");
      useShopStore.getState().navigateTo("catalog");
      useShopStore.getState().setSortBy(siteSettings.sortBestSelling || "الأكثر مبيعاً");
      setTimeout(() => {
        document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else if (item.scrollToProducts) {
      setSelectedCategory(siteSettings.navAllProductsText || "كل المنتجات");
      useShopStore.getState().navigateTo("catalog");
      setTimeout(() => {
        document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      useShopStore.getState().navigateTo("catalog");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleCategoryClick = (catId: number, catName: string) => {
    setMobileMenuOpen(false);
    setCatDropdownOpen(false);
    setSelectedCategory(catName);
    useShopStore.getState().navigateTo("catalog", null, catId);
    setTimeout(() => {
      document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  return (
    <header className={`sticky top-0 z-40 glass border-b border-[#F0E0C0]/50 shadow-sm transition-all duration-300 ${scrolled ? "glass-header-scrolled" : ""}`}>
      {/* Luxury gradient accent line at top */}
      <div className="h-[2px] bg-gradient-to-l from-[#C85A00] via-[#F5C400] to-[#F07800]" />
      <div className={`${getLayoutMaxWidth(siteSettings.layoutWidth)} mx-auto px-3 sm:px-4 ${hs.wrapper} flex items-center justify-between`}>
        {/* Logo */}
        <button
          onClick={handleLogoClick}
          className="flex items-center gap-1.5 sm:gap-2.5 hover:opacity-90 transition group"
        >
          {siteSettings.storeLogoUrl ? (
            <div className="relative">
              <img
                src={siteSettings.storeLogoUrl}
                alt={siteSettings.storeName || "صيدليتي"}
                className={`${hs.logo} rounded-xl object-cover shadow-md group-hover:shadow-lg transition-shadow`}
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-[#F07800]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ) : (
            <div className={`${hs.logo} rounded-xl bg-gradient-to-bl from-[#F07800] via-[#F5C400] to-[#F07800] bg-gradient-animated flex items-center justify-center text-white font-bold shadow-lg shadow-[#F07800]/20`}>
              {siteSettings.storeLogoLetter || "ص"}
            </div>
          )}
          <span className={`${hs.text} font-bold bg-gradient-to-l from-[#C85A00] to-[#F07800] bg-clip-text text-transparent`}>{siteSettings.storeName || "صيدليتي"}</span>
        </button>

        {/* Nav Links - hidden on mobile */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item, i) => (
            <button
              key={i}
              onClick={() => handleNavClick(item)}
              className={`${hs.nav} text-[#555] hover:text-[#F07800] hover:bg-[#FFF8E8] rounded-xl transition-all duration-300 relative after:absolute after:bottom-0 after:right-0 after:w-0 after:h-[2px] after:bg-gradient-to-l after:from-[#F07800] after:to-[#F5C400] after:rounded-full hover:after:w-full after:transition-all after:duration-300`}
            >
              {item.label}
            </button>
          ))}

          {/* Categories Dropdown - Desktop */}
          {categories.length > 0 && (
            <div ref={catDropdownRef} className="relative">
              <button
                onClick={() => setCatDropdownOpen(!catDropdownOpen)}
                className={`${hs.nav} text-[#555] hover:text-[#F07800] hover:bg-[#FFF8E8] rounded-xl transition-all duration-300 flex items-center gap-1 after:absolute after:bottom-0 after:right-0 after:w-0 after:h-[2px] after:bg-gradient-to-l after:from-[#F07800] after:to-[#F5C400] after:rounded-full hover:after:w-full after:transition-all after:duration-300`}
              >
                الأقسام
                <ChevronDown size={14} className={`transition-transform duration-300 ${catDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {catDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 py-2 min-w-[180px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl shadow-[#F07800]/10 border border-[#F0E0C0]/50 z-50 animate-scale-fade-in">
                  {categories.sort((a, b) => a.order - b.order).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat.id, cat.name)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#555] hover:text-[#F07800] hover:bg-[#FFF8E8] transition-all duration-200 text-sm text-right"
                    >
                      <span className="text-base">{cat.icon}</span>
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Cart + Mobile Menu */}
        <div className="flex items-center gap-2">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 text-[#C85A00] hover:bg-[#FFF8E8] rounded-xl transition-all duration-300"
          >
            <Menu size={22} />
          </button>

          <button
            onClick={() => setCartOpen(true)}
            className={`relative ${hs.cart} bg-gradient-to-bl from-[#FFF3C4] to-[#FFE8A0] hover:from-[#FFE8A0] hover:to-[#FFD866] text-[#C85A00] rounded-xl transition-all duration-300 hover:shadow-md hover:shadow-[#F07800]/10 group`}
          >
            <ShoppingCart size={20} className="group-hover:scale-110 transition-transform" />
            {cartCount > 0 && (
              <span
                key={cartCount}
                className="absolute -top-1.5 -left-1.5 bg-gradient-to-bl from-[#F07800] to-[#C85A00] text-white text-[10px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center shadow-lg shadow-[#F07800]/30 animate-badge-bounce"
              >
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fade-in md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Menu Panel */}
          <div className="fixed top-0 right-0 h-full w-[300px] max-w-[85vw] bg-[#FFFBF0] z-50 shadow-2xl animate-slide-in-right md:hidden overflow-y-auto">
            {/* Menu Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#F0E0C0]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-bl from-[#F07800] via-[#F5C400] to-[#F07800] flex items-center justify-center text-white font-bold shadow-lg shadow-[#F07800]/20">
                  {siteSettings.storeLogoLetter || "ص"}
                </div>
                <span className="font-bold text-[#C85A00]">{siteSettings.storeName || "صيدليتي"}</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-[#999] hover:text-[#C85A00] hover:bg-[#FFF8E8] rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>
            {/* Menu Items */}
            <nav className="p-3">
              {navItems.map((item, i) => (
                <button
                  key={i}
                  onClick={() => handleNavClick(item)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-[#555] hover:text-[#F07800] hover:bg-[#FFF8E8] rounded-xl transition-all duration-300 text-right group"
                >
                  <span className="text-[#C85A00]/60 group-hover:text-[#F07800] transition-colors">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}

              {/* Categories in Mobile Menu */}
              {categories.length > 0 && (
                <>
                  <div className="flex items-center gap-2 px-4 py-2 mt-2">
                    <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[#F0E0C0] to-transparent" />
                    <span className="text-[11px] font-bold text-[#C85A00]/50 tracking-wider">الأقسام</span>
                    <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[#F0E0C0] to-transparent" />
                  </div>
                  {categories.sort((a, b) => a.order - b.order).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat.id, cat.name)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-[#555] hover:text-[#F07800] hover:bg-[#FFF8E8] rounded-xl transition-all duration-300 text-right group"
                    >
                      <span className="text-base">{cat.icon}</span>
                      <span className="text-sm font-medium">{cat.name}</span>
                      <ChevronLeft size={14} className="mr-auto text-[#C85A00]/30 group-hover:text-[#F07800] transition-colors" />
                    </button>
                  ))}
                </>
              )}
            </nav>
            {/* Menu Footer */}
            <div className="p-4 border-t border-[#F0E0C0] mt-4">
              <div className="flex items-center gap-2 text-xs text-[#999]">
                <Shield size={14} />
                <span>الدفع عند الاستلام فقط</span>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}

/* ─── Hero Section ─── */
function HeroSection() {
  const { setCurrentView, siteSettings } = useShopStore();
  return (
    <>
    <section className="relative overflow-hidden bg-gradient-to-bl from-[#C85A00] via-[#F07800] via-30% to-[#F5C400] py-8 sm:py-12 md:py-20 mobile-hero-compact">
      {/* Animated floating decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-8 right-[10%] w-32 h-32 rounded-full bg-white/10 blur-2xl animate-float" />
        <div className="absolute bottom-12 left-[15%] w-48 h-48 rounded-full bg-[#F5C400]/20 blur-3xl animate-float-slow" />
        <div className="absolute top-1/2 right-1/3 w-24 h-24 rounded-full bg-white/15 blur-xl animate-float-delay" />
        <div className="absolute top-4 left-[5%] w-16 h-16 rounded-full bg-[#FFD700]/20 blur-lg animate-float" />
        <div className="absolute bottom-4 right-[5%] w-20 h-20 rounded-full bg-white/10 blur-xl animate-float-delay" />
        {/* Sparkle dots */}
        <div className="absolute top-[20%] right-[20%] w-1.5 h-1.5 rounded-full bg-white/60 animate-sparkle" />
        <div className="absolute top-[40%] left-[30%] w-1 h-1 rounded-full bg-white/50 animate-sparkle" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-[30%] right-[40%] w-2 h-2 rounded-full bg-[#FFD700]/60 animate-sparkle" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[60%] left-[60%] w-1.5 h-1.5 rounded-full bg-white/40 animate-sparkle" style={{ animationDelay: '1.5s' }} />
      </div>
      {/* Elegant pattern overlay */}
      <div className="absolute inset-0 bg-pattern opacity-5" />
      
      <div className={`${getLayoutMaxWidth(siteSettings.layoutWidth)} mx-auto px-3 sm:px-4 relative`}>
        <div
          className="text-center animate-fade-in-up hero-parallax hero-parallax-content"
        >
          {/* Premium badge above title */}
          <div
            className="inline-flex items-center gap-1.5 sm:gap-2 glass-gold rounded-full px-3 sm:px-5 py-1 sm:py-1.5 mb-2 sm:mb-5 animate-scale-in"
            style={{ animationDelay: '0.2s' }}
          >
            <span className="text-[10px] sm:text-xs font-bold text-[#C85A00]">{siteSettings.heroBadgeText || "✦ منتجات أصلية مضمونة ✦"}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-2 sm:mb-4 leading-tight drop-shadow-lg">
            {siteSettings.heroTitle || "منتجات العناية بالبشرة"}
            <br />
            <span className="animate-gold-shimmer text-3xl sm:text-4xl md:text-6xl lg:text-7xl">{siteSettings.heroSubtitle || "الأصلية 100%"}</span>
          </h1>
          <p className="text-white/90 text-sm sm:text-base md:text-lg mb-4 sm:mb-8 max-w-lg mx-auto leading-relaxed">
            {siteSettings.heroDescLine1 || "منتجات أصلية مضمونة — الدفع عند الاستلام فقط"}
            <br />
            {siteSettings.heroDescLine2 || "اطلب واطمن على المنتج الأولاني وبعدين ادفع!"}
          </p>
          <button
            onClick={() => {
              useShopStore.getState().navigateTo("catalog");
              setTimeout(() => {
                document
                  .getElementById("products-section")
                  ?.scrollIntoView({ behavior: "smooth" });
              }, 100);
            }}
            className="btn-luxury hover:scale-105 active:scale-95 transition-transform bg-white text-[#C85A00] font-bold px-6 sm:px-10 py-2.5 sm:py-4 rounded-2xl shadow-xl shadow-[#7B3F00]/20 text-sm sm:text-base border border-white/50"
          >
            {siteSettings.heroButtonText || "تسوق الآن ←"}
          </button>

          {/* Trust Badges - Bold & Visible */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 md:gap-4 mt-6 sm:mt-10 hero-badge-stagger">
            {[
              {
                icon: <CheckCircle size={16} className="sm:w-[18px] sm:h-[18px]" />,
                text: siteSettings.badgeOriginalText || "منتجات أصلية",
                bg: "bg-emerald-500",
                border: "border-emerald-400",
                shadow: "shadow-emerald-500/40",
                iconColor: "text-white",
                textColor: "text-white",
              },
              {
                icon: <CreditCard size={16} className="sm:w-[18px] sm:h-[18px]" />,
                text: siteSettings.badgeCODText || "دفع عند الاستلام",
                bg: "bg-amber-500",
                border: "border-amber-400",
                shadow: "shadow-amber-500/40",
                iconColor: "text-white",
                textColor: "text-white",
              },
              {
                icon: <Truck size={16} className="sm:w-[18px] sm:h-[18px]" />,
                text: siteSettings.badgeDeliveryText || "توصيل سريع مجاناً",
                bg: "bg-sky-500",
                border: "border-sky-400",
                shadow: "shadow-sky-500/40",
                iconColor: "text-white",
                textColor: "text-white",
              },
              {
                icon: <RotateCcw size={16} className="sm:w-[18px] sm:h-[18px]" />,
                text: siteSettings.badgeReturnText || "استرجاع 7 أيام",
                bg: "bg-purple-500",
                border: "border-purple-400",
                shadow: "shadow-purple-500/40",
                iconColor: "text-white",
                textColor: "text-white",
              },
            ].map((b, i) => (
              <div
                key={i}
                className={`flex items-center gap-1.5 sm:gap-2 ${b.bg} ${b.border} ${b.shadow} border rounded-full px-3 sm:px-5 py-1.5 sm:py-2.5 ${b.textColor} text-[10px] sm:text-xs md:text-sm font-bold shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-300 cursor-default animate-slide-up`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <span className={b.iconColor}>{b.icon}</span>
                <span>{b.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Bottom wave separator - dual wave for depth */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full" preserveAspectRatio="none">
          <path d="M0 80V45C120 20 240 10 360 25C480 40 600 60 720 55C840 50 960 20 1080 15C1200 10 1320 30 1440 45V80H0Z" fill="rgba(255,251,240,0.4)" />
          <path d="M0 80V55C180 30 360 20 540 35C720 50 900 65 1080 55C1260 45 1350 30 1440 40V80H0Z" fill="#FFFBF0" />
        </svg>
      </div>
    </section>

    {/* ─── Advantages Section ─── */}
    <AdvantagesSection />
    </>
  );
}

/* ─── Advantages Section (Feature Highlights) ─── */
function AdvantagesSection() {
  const { siteSettings } = useShopStore();
  const advantages = [
    {
      icon: <Shield size={28} className="text-[#2d8a4e]" />,
      title: siteSettings.advOriginalTitle || "منتجات أصلية",
      desc: siteSettings.advOriginalDesc || "مضمونة 100% من مصادر موثوقة",
      color: "#2d8a4e",
      bg: "from-emerald-50 to-green-50",
      border: "border-emerald-200/60",
      iconBg: "bg-emerald-100",
      glow: "shadow-emerald-200/40",
    },
    {
      icon: <CreditCard size={28} className="text-[#F07800]" />,
      title: siteSettings.advCODTitle || "دفع عند الاستلام",
      desc: siteSettings.advCODDesc || "اطمن الأول وبعدين ادفع",
      color: "#F07800",
      bg: "from-orange-50 to-amber-50",
      border: "border-orange-200/60",
      iconBg: "bg-orange-100",
      glow: "shadow-orange-200/40",
    },
    {
      icon: <Truck size={28} className="text-[#2563eb]" />,
      title: siteSettings.advDeliveryTitle || "توصيل سريع مجاناً",
      desc: siteSettings.advDeliveryDesc || "للطلبات فوق 300 ج.م",
      color: "#2563eb",
      bg: "from-blue-50 to-indigo-50",
      border: "border-blue-200/60",
      iconBg: "bg-blue-100",
      glow: "shadow-blue-200/40",
    },
    {
      icon: <RotateCcw size={28} className="text-[#9333ea]" />,
      title: siteSettings.advReturnTitle || "استرجاع 7 أيام",
      desc: siteSettings.advReturnDesc || "لو مش أصلي هنجيب فلوسك",
      color: "#9333ea",
      bg: "from-purple-50 to-fuchsia-50",
      border: "border-purple-200/60",
      iconBg: "bg-purple-100",
      glow: "shadow-purple-200/40",
    },
  ];

  return (
    <section className={`${getLayoutMaxWidth(siteSettings.layoutWidth)} mx-auto px-3 sm:px-4 py-4 sm:py-8`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        {advantages.map((adv, i) => (
          <div
            key={i}
            className={`relative overflow-hidden bg-gradient-to-br ${adv.bg} rounded-2xl sm:rounded-3xl border ${adv.border} p-3 sm:p-5 text-center group hover:shadow-xl ${adv.glow} hover:-translate-y-1 transition-all duration-500 cursor-default animate-fade-in-up card-glow`}
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            {/* Decorative corner accent */}
            <div className="absolute top-0 left-0 w-16 h-16 opacity-[0.07] pointer-events-none">
              <div className={`absolute top-2 left-2 w-10 h-10 rounded-full bg-[${adv.color}]`} />
            </div>

            {/* Icon */}
            <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 ${adv.iconBg} rounded-xl sm:rounded-2xl mb-2 sm:mb-3 group-hover:scale-110 transition-transform duration-500 shadow-sm`}>
              {adv.icon}
            </div>

            {/* Title */}
            <h3 className="text-xs sm:text-sm md:text-base font-bold text-[#1A1A1A] mb-1 leading-tight">
              {adv.title}
            </h3>

            {/* Description */}
            <p className="text-[10px] sm:text-xs text-[#888] leading-relaxed hidden sm:block">
              {adv.desc}
            </p>

            {/* Bottom accent line */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[3px] rounded-full transition-all duration-500 group-hover:w-3/4" style={{ background: `linear-gradient(to left, ${adv.color}, ${adv.color}88)` }} />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Product Card ─── */
function ProductCard({ product, index }: { product: Product; index: number }) {
  const { addToCart, changeQty, getCartQty, setCartOpen, siteSettings, setSelectedProductId, setCurrentView, coupons, gifts } = useShopStore();
  const qty = getCartQty(product.id);
  const finalPrice = calcFinalPrice(product.price, product.disc);
  const isEven = index % 2 === 0;
  const [isMobile, setIsMobile] = useState(false);

  // Check if this product has applicable coupons
  const hasCoupon = coupons.some((c) => c.active && (
    !c.productIds || c.productIds.length === 0 || c.productIds.includes(product.id)
  ));
  // Check if this product triggers a gift
  const triggersGift = gifts.some((g) => g.active && (
    !g.triggerProductIds || (g.triggerProductIds as number[]).length === 0 || (g.triggerProductIds as number[]).includes(product.id)
  ));
  // Check if this product IS a gift
  const isGiftProduct = gifts.some((g) => g.active && g.productId === product.id);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Get mobile card classes
  const mobileCard = getMobileCardClasses(siteSettings.mobileCardStyle, siteSettings.mobileCardSize);
  const mobileStyle = siteSettings.mobileCardStyle;
  const mobileSize = siteSettings.mobileCardSize;

  // Determine layout: on mobile use mobileCardStyle, on desktop use horizontal
  const isMobileHorizontal = isMobile && mobileStyle === "horizontal";
  const isMobileGrid = isMobile && mobileStyle === "grid";
  const isMobileVertical = isMobile && mobileStyle === "vertical";

  // Desktop: always horizontal alternating layout
  // Mobile horizontal: image on one side, info on other
  // Mobile vertical: image on top, info below (but compact)
  // Mobile grid: 2-col grid, very compact

  const imageHeight = isMobile
    ? mobileCard.imageClass
    : getProductImageHeight(siteSettings.productImageHeight);

  return (
    <div
      className={`${isMobile ? mobileCard.wrapperClass : "rounded-3xl"} overflow-hidden card-premium card-glow cursor-pointer relative group animate-slide-up`}
      style={{
        background: "linear-gradient(135deg, #FFF8E8 0%, #FFFBF0 50%, #FFF3C4 100%)",
        boxShadow: "0 4px 15px -3px rgba(240, 120, 0, 0.08), 0 1px 3px rgba(0,0,0,0.04)",
        animationDelay: `${index * 0.06}s`,
      }}
      onClick={() => {
        useShopStore.getState().navigateTo("productDetail", product.id);
      }}
    >
      {/* View Details Indicator - Premium style - hidden on mobile */}
      {!isMobile && (
      <div className="absolute top-3 right-3 z-10 glass text-[#F07800] w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg shadow-[#F07800]/10 group-hover:scale-110">
        <Eye size={14} />
      </div>
      )}
      {/* Premium corner accent - hidden on mobile */}
      {!isMobile && <div className="absolute top-0 left-0 w-16 h-16 bg-gradient-to-br from-[#F07800]/10 to-transparent rounded-br-3xl pointer-events-none" />}
      {/* Top gradient line accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-l from-transparent via-[#F07800]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div
        className={`flex ${
          isMobile
            ? isMobileGrid
              ? "flex-col"
              : isMobileHorizontal
              ? "flex-row"
              : "flex-col"
            : `flex-col sm:flex-row ${isEven ? "sm:flex-row" : "sm:flex-row-reverse"}`
        }`}
      >
        {/* Image Side */}
        <div
          className={`relative ${imageHeight} flex-shrink-0 overflow-hidden img-shimmer ${
            product.img
              ? "bg-gradient-to-br from-[#F07800] to-[#F5C400]"
              : "bg-gradient-to-br from-[#FFF3C4] to-[#FFE8A0]"
          } ${isMobile && isMobileHorizontal ? "max-w-[45%]" : "w-full"}`}
        >
          {product.img ? (
            <img
              src={product.img}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white/60 gap-2">
              <Package size={isMobile ? 24 : 40} strokeWidth={1} />
              {!isMobile && <span className="text-xs">صورة المنتج</span>}
            </div>
          )}
          {/* Discount Badge - Premium gradient */}
          {product.disc > 0 && (
            <div className={`absolute top-2 left-2 ${isMobile ? "w-8 h-8 text-[9px]" : "w-11 h-11 text-xs"} rounded-full bg-gradient-to-bl from-[#F07800] to-[#C85A00] text-white font-bold flex items-center justify-center shadow-lg shadow-[#F07800]/30`}>
              {product.disc}%
            </div>
          )}
          {/* Gift Badge - on trigger products */}
          {triggersGift && (
            <div className={`absolute top-2 right-2 ${isMobile ? "px-1.5 py-0.5 text-[8px]" : "px-2.5 py-1 text-[10px]"} rounded-full bg-gradient-to-bl from-[#2d8a4e] to-[#1a6b37] text-white font-bold flex items-center gap-0.5 shadow-lg shadow-[#2d8a4e]/30 z-10`}>
              <GiftIcon size={isMobile ? 8 : 10} />
              هدية
            </div>
          )}
          {/* Coupon Badge - on products with applicable coupons */}
          {hasCoupon && !triggersGift && (
            <div className={`absolute top-2 right-2 ${isMobile ? "px-1.5 py-0.5 text-[8px]" : "px-2.5 py-1 text-[10px]"} rounded-full bg-gradient-to-bl from-[#7C3AED] to-[#5B21B6] text-white font-bold flex items-center gap-0.5 shadow-lg shadow-[#7C3AED]/30 z-10`}>
              <Tag size={isMobile ? 8 : 10} />
              خصم
            </div>
          )}
          {/* Video Indicator Badge */}
          {product.video && (
            <div className={`absolute bottom-2 left-2 ${isMobile ? "px-1.5 py-0.5 text-[8px]" : "px-2 py-1 text-[10px]"} rounded-full bg-black/50 backdrop-blur-sm text-white font-bold flex items-center gap-0.5 z-10`}>
              <Video size={isMobile ? 8 : 10} />
              فيديو
            </div>
          )}
        </div>

        {/* Info Side */}
        <div
          className={`flex-1 bg-white/90 backdrop-blur-sm ${
            isMobile ? mobileCard.infoClass : "p-5 sm:p-6 gap-2"
          } flex flex-col justify-center relative ${
            isMobile
              ? isMobileHorizontal
                ? ""
                : ""
              : isEven
              ? "sm:rounded-r-[26px]"
              : "sm:rounded-l-[26px]"
          }`}
        >
          {/* Tags - hide on compact mobile */}
          {!mobileCard.tagsHide && product.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-1">
              {product.tags.map((t, i) => (
                <span
                  key={i}
                  className="text-[10px] bg-gradient-to-l from-[#FFF3C4] to-[#FFE8A0] text-[#C85A00] px-2.5 py-0.5 rounded-full font-medium border border-[#F07800]/10"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Best Seller Badge - Premium */}
          {product.sold > 300 && !(isMobile && mobileCard.ratingHide) && (
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[10px] bg-gradient-to-l from-[#EAF3DE] to-[#D4EDBC] text-[#2d8a4e] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-sm">
                <BadgePercent size={10} />
                الأكثر مبيعاً
              </span>
            </div>
          )}

          {/* Name */}
          <h3 className={`font-bold ${isMobile ? mobileCard.nameClass : "text-base md:text-lg"} text-[#1A1A1A] leading-snug group-hover:text-[#C85A00] transition-colors duration-300 ${isMobile && isMobileHorizontal ? "line-clamp-2" : ""}`}>
            {product.name}
          </h3>
          {/* Gift/Coupon incentive text */}
          {triggersGift && (
            <span className="text-[10px] sm:text-[11px] text-[#2d8a4e] font-bold flex items-center gap-0.5 mt-0.5">
              <GiftIcon size={10} /> مع هدية مجانية!
            </span>
          )}
          {!triggersGift && hasCoupon && (
            <span className="text-[10px] sm:text-[11px] text-[#7C3AED] font-bold flex items-center gap-0.5 mt-0.5">
              <Tag size={10} /> خصم إضافي بالكوبون!
            </span>
          )}

          {/* Description - shorter on mobile, hide on compact horizontal */}
          {!(isMobile && isMobileHorizontal && mobileSize === "compact") && (
          <p className={`${isMobile ? mobileCard.descClass : "text-xs md:text-sm"} text-[#777] line-clamp-2 leading-relaxed`}>
            {product.desc}
          </p>
          )}

          {/* Rating - hide on compact mobile */}
          {!(isMobile && mobileCard.ratingHide) && (
            <StarRating rating={product.rating} reviews={product.reviews} />
          )}

          {/* Price Row */}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {product.disc > 0 && (
              <span className={`${isMobile ? "text-[10px]" : "text-xs"} text-[#bbb] line-through`}>
                {formatPrice(product.price)} ج.م
              </span>
            )}
            <span className={`${isMobile ? mobileCard.priceClass : "text-lg md:text-xl"} font-bold bg-gradient-to-l from-[#C85A00] to-[#F07800] bg-clip-text text-transparent`}>
              {formatPrice(finalPrice)} ج.م
            </span>
            {product.disc > 0 && !(isMobile && mobileSize === "compact") && (
              <span className="text-[10px] bg-gradient-to-l from-[#F07800] to-[#C85A00] text-white px-2.5 py-0.5 rounded-full font-bold shadow-sm shadow-[#F07800]/20">
                وفر {formatPrice(product.price - finalPrice)} ج.م
              </span>
            )}
          </div>

          {/* Add to Cart - Premium Button */}
          <div className="mt-1.5">
            {qty === 0 ? (
              <button
                onClick={(e) => { e.stopPropagation(); addToCart(product.id); showCartFlash(product.name); }}
                className={`${isMobile && mobileSize === "compact" ? "py-1.5 px-4 text-xs" : "py-2.5 px-6 text-sm"} btn-luxury bg-gradient-to-l from-[#F07800] to-[#C85A00] text-white font-medium rounded-xl flex items-center gap-1.5 shadow-md shadow-[#F07800]/20`}
              >
                <ShoppingCart size={isMobile && mobileSize === "compact" ? 12 : 15} />
                أضف للسلة
              </button>
            ) : (
              <div className={`flex items-center ${isMobile && mobileSize === "compact" ? "gap-2" : "gap-3"} bg-gradient-to-l from-[#FFF8E8] to-[#FFF3C4] rounded-xl ${isMobile && mobileSize === "compact" ? "p-1.5" : "p-2"} border border-[#F0E0C0]/50`} onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => changeQty(product.id, -1)}
                  className={`${isMobile && mobileSize === "compact" ? "w-6 h-6 text-xs" : "w-8 h-8 text-sm"} rounded-lg border border-[#F07800] text-[#F07800] hover:bg-[#F07800] hover:text-white flex items-center justify-center transition-all duration-200 font-bold`}
                >
                  −
                </button>
                <span className={`font-bold text-[#C85A00] ${isMobile && mobileSize === "compact" ? "text-sm" : "text-base"} min-w-[20px] text-center`}>
                  {qty}
                </span>
                <button
                  onClick={() => { addToCart(product.id); showCartFlash(product.name); }}
                  className={`${isMobile && mobileSize === "compact" ? "w-6 h-6 text-xs" : "w-8 h-8 text-sm"} rounded-lg border border-[#F07800] text-[#F07800] hover:bg-[#F07800] hover:text-white flex items-center justify-center transition-all duration-200 font-bold`}
                >
                  +
                </button>
                <span className="text-[#2d8a4e] text-[10px] font-medium flex items-center gap-0.5 mr-1">
                  <CheckCircle size={isMobile && mobileSize === "compact" ? 10 : 13} />
                  في السلة
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Offers & Gifts Marketing Section ─── */
function OffersMarketingSection() {
  const { coupons, gifts, products, addToCart, siteSettings } = useShopStore();
  const activeCoupons = coupons.filter((c) => c.active);
  const activeGifts = gifts.filter((g) => g.active);

  if (activeCoupons.length === 0 && activeGifts.length === 0) return null;

  return (
    <section className={`${getLayoutMaxWidth(siteSettings.layoutWidth)} mx-auto px-3 sm:px-4 py-4 sm:py-6`}>
      {/* Active Coupons */}
      {activeCoupons.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-bl from-[#F07800] to-[#C85A00] flex items-center justify-center shadow-md shadow-[#F07800]/20">
              <Tag size={16} className="text-white" />
            </div>
            <h2 className="text-base sm:text-lg font-bold bg-gradient-to-l from-[#C85A00] to-[#F07800] bg-clip-text text-transparent">عروض خصم حصرية!</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar snap-x snap-mandatory">
            {activeCoupons.map((c) => {
              const applicableProducts = (c.productIds && c.productIds.length > 0)
                ? products.filter((p) => c.productIds.includes(p.id))
                : [];
              return (
                <div
                  key={c.id}
                  className="flex-shrink-0 w-[260px] sm:w-[300px] snap-start rounded-2xl overflow-hidden border border-[#F0E0C0] bg-gradient-to-bl from-[#FFF8E8] to-white shadow-lg shadow-[#F07800]/5 hover:shadow-xl hover:shadow-[#F07800]/10 transition-all duration-300 group"
                >
                  {/* Coupon Header */}
                  <div className="bg-gradient-to-l from-[#F07800] to-[#C85A00] px-4 py-3 relative overflow-hidden">
                    <div className="absolute inset-0 bg-pattern opacity-10" />
                    <div className="relative flex items-center justify-between">
                      <div>
                        <p className="text-white/80 text-[10px] font-medium">كود خصم</p>
                        <p className="text-white font-bold text-lg tracking-wider font-mono">{c.code}</p>
                      </div>
                      <div className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-1.5 text-center">
                        <p className="text-white font-bold text-xl">
                          {c.type === "percentage" ? `${c.value}%` : `${c.value}`}
                        </p>
                        <p className="text-white/80 text-[9px]">
                          {c.type === "percentage" ? "خصم" : "ج.م خصم"}
                        </p>
                      </div>
                    </div>
                    {/* Dashed border effect */}
                    <div className="absolute bottom-0 left-0 right-0 border-b-2 border-dashed border-white/30" />
                  </div>
                  {/* Coupon Body */}
                  <div className="px-4 py-3">
                    {applicableProducts.length > 0 ? (
                      <div>
                        <p className="text-[10px] text-[#999] mb-1.5">ينطبق على:</p>
                        <div className="flex gap-1.5 overflow-x-auto">
                          {applicableProducts.slice(0, 4).map((p) => (
                            <div key={p.id} className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden border border-[#F0E0C0] bg-[#FFF8E8]">
                              {p.img ? (
                                <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package size={14} className="text-[#F0E0C0]" />
                                </div>
                              )}
                            </div>
                          ))}
                          {applicableProducts.length > 4 && (
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#FFF3C4] flex items-center justify-center border border-[#F0E0C0]">
                              <span className="text-[9px] text-[#C85A00] font-bold">+{applicableProducts.length - 4}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-[#777] mt-1.5 truncate">
                          {applicableProducts.slice(0, 3).map(p => p.name).join(" • ")}
                          {applicableProducts.length > 3 && ` +${applicableProducts.length - 3}`}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-[#777]">ينطبق على جميع المنتجات</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-[#999]">
                      {c.minOrder > 0 && <span>الحد الأدنى: {c.minOrder} ج.م</span>}
                      {c.expiresAt && <span>ينتهي: {new Date(c.expiresAt).toLocaleDateString("ar-EG")}</span>}
                    </div>
                    {/* Copy code button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard?.writeText(c.code);
                        const btn = e.currentTarget;
                        btn.textContent = "تم النسخ!";
                        setTimeout(() => { btn.textContent = "انسخ الكود"; }, 1500);
                      }}
                      className="mt-2 w-full py-1.5 bg-gradient-to-l from-[#FFF3C4] to-[#FFE8A0] border border-[#F0E0C0] rounded-lg text-xs font-bold text-[#C85A00] hover:from-[#FFE8A0] hover:to-[#FFD866] transition-all flex items-center justify-center gap-1"
                    >
                      <Copy size={12} />
                      انسخ الكود
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Gifts */}
      {activeGifts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-bl from-[#2d8a4e] to-[#1a6b37] flex items-center justify-center shadow-md shadow-[#2d8a4e]/20">
              <GiftIcon size={16} className="text-white" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#2d8a4e]">هدايا مجانية مع مشترياتك!</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeGifts.map((g) => {
              const giftProduct = products.find((p) => p.id === g.productId);
              const triggerProducts = (g.triggerProductIds && (g.triggerProductIds as number[]).length > 0)
                ? products.filter((p) => (g.triggerProductIds as number[]).includes(p.id))
                : [];
              if (!giftProduct) return null;
              return (
                <div
                  key={g.id}
                  className="rounded-2xl overflow-hidden border border-[#2d8a4e]/20 bg-gradient-to-bl from-[#EAF3DE]/30 to-white shadow-md shadow-[#2d8a4e]/5 hover:shadow-lg hover:shadow-[#2d8a4e]/10 transition-all duration-300"
                >
                  <div className="flex items-center gap-3 p-3 sm:p-4">
                    {/* Gift product image */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 border-2 border-[#2d8a4e]/20 bg-[#EAF3DE] relative">
                      {giftProduct.img ? (
                        <img src={giftProduct.img} alt={giftProduct.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <GiftIcon size={28} className="text-[#2d8a4e]/40" />
                        </div>
                      )}
                      <div className="absolute top-0.5 left-0.5 bg-[#2d8a4e] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md">
                        مجاني
                      </div>
                    </div>
                    {/* Gift info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-[#1A1A1A] truncate">{g.name}</p>
                      <p className="text-[11px] text-[#2d8a4e] font-medium mt-0.5">{giftProduct.name}</p>
                      {triggerProducts.length > 0 ? (
                        <div className="mt-1.5">
                          <p className="text-[10px] text-[#777]">عند شراء:</p>
                          <div className="flex gap-1 mt-1">
                            {triggerProducts.slice(0, 3).map((p) => (
                              <div key={p.id} className="w-7 h-7 rounded-md overflow-hidden border border-[#F0E0C0] bg-[#FFF8E8]">
                                {p.img ? (
                                  <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package size={10} className="text-[#F0E0C0]" />
                                  </div>
                                )}
                              </div>
                            ))}
                            {triggerProducts.length > 3 && (
                              <span className="text-[9px] text-[#999] self-center">+{triggerProducts.length - 3}</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-[#777] mt-1">
                          {g.minOrder > 0 ? `عند طلب أكثر من ${g.minOrder} ج.م` : "مع أي طلب"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

/* ─── Catalog Section ─── */
function CatalogSection() {
  const {
    products,
    categories,
    searchQuery,
    selectedCategory,
    sortBy,
    setSearchQuery,
    setSelectedCategory,
    setSortBy,
    siteSettings,
  } = useShopStore();

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  let filtered = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.desc?.toLowerCase().includes(q);
    const matchCat =
      selectedCategory === (siteSettings.navAllProductsText || "كل المنتجات") || p.cat === selectedCategory;
    return matchSearch && matchCat;
  });

  // Sort
  const sortNewest = siteSettings.sortNewest || "الأحدث";
  const sortPriceLow = siteSettings.sortPriceLow || "السعر: من الأقل";
  const sortPriceHigh = siteSettings.sortPriceHigh || "السعر: من الأعلى";
  const sortBestSelling = siteSettings.sortBestSelling || "الأكثر مبيعاً";

  if (sortBy === sortPriceLow) {
    filtered = [...filtered].sort(
      (a, b) => calcFinalPrice(a.price, a.disc) - calcFinalPrice(b.price, b.disc)
    );
  } else if (sortBy === sortPriceHigh) {
    filtered = [...filtered].sort(
      (a, b) => calcFinalPrice(b.price, b.disc) - calcFinalPrice(a.price, a.disc)
    );
  } else if (sortBy === sortBestSelling) {
    filtered = [...filtered].sort((a, b) => (b.sold || 0) - (a.sold || 0));
  }

  const mobileStyle = siteSettings.mobileCardStyle;
  const isGrid = isMobile && mobileStyle === "grid";
  const catStyle = siteSettings.mobileCatStyle;

  return (
    <section id="products-section" className={`${getLayoutMaxWidth(siteSettings.layoutWidth)} mx-auto px-3 sm:px-4 py-3 sm:py-6`}>
      {/* Category Pills - Premium design */}
      <div className={`${
        isMobile && catStyle === "wrap"
          ? "flex flex-wrap gap-1.5 pb-2 mb-2"
          : isMobile && catStyle === "grid"
          ? "grid grid-cols-3 gap-1.5 pb-2 mb-2"
          : isMobile
          ? "flex gap-1.5 overflow-x-auto hide-scrollbar pb-2 mb-2"
          : "flex gap-2 overflow-x-auto hide-scrollbar pb-3 mb-4"
      } stagger-children mobile-cat-compact`}>
        <button
          onClick={() => {
            setSelectedCategory(siteSettings.navAllProductsText || "كل المنتجات");
            if (typeof window !== "undefined" && window.location.pathname !== "/") {
              window.history.pushState({ view: "catalog" }, "", "/");
            }
          }}
          className={`whitespace-nowrap ${
            isMobile ? "px-2.5 py-1 text-[11px]" : isMobile && catStyle === "grid" ? "px-2 py-1.5 text-[11px]" : "px-4 py-2 text-sm"
          } rounded-xl font-medium transition-all duration-300 ${
            selectedCategory === (siteSettings.navAllProductsText || "كل المنتجات")
              ? "bg-gradient-to-l from-[#F07800] to-[#C85A00] text-white shadow-lg shadow-[#F07800]/25"
              : "glass-gold text-[#777] hover:border-[#F07800] hover:text-[#F07800]"
          }`}
        >
          {siteSettings.navAllProductsText || "كل المنتجات"}
        </button>
        {[...categories]
          .sort((a, b) => a.order - b.order)
          .map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.name);
                useShopStore.getState().navigateTo("catalog", null, cat.id);
              }}
              className={`whitespace-nowrap ${
                isMobile ? "px-2.5 py-1 text-[11px]" : isMobile && catStyle === "grid" ? "px-2 py-1.5 text-[11px]" : "px-4 py-2 text-sm"
              } rounded-xl font-medium transition-all duration-300 ${
                selectedCategory === cat.name
                  ? "bg-gradient-to-l from-[#F07800] to-[#C85A00] text-white shadow-lg shadow-[#F07800]/25"
                  : "glass-gold text-[#777] hover:border-[#F07800] hover:text-[#F07800]"
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
      </div>

      {/* Search & Sort - Premium design */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-3 sm:mb-6 mobile-search-compact">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C85A00]/50"
          />
          <input
            type="text"
            placeholder={siteSettings.searchPlaceholder || "ابحث عن منتج..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 sm:py-2.5 glass-gold rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#F07800]/30 focus:border-[#F07800] transition-all duration-300 input-premium"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="glass-gold rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-[#555] focus:outline-none focus:ring-2 focus:ring-[#F07800]/30 cursor-pointer input-premium"
        >
          <option>{siteSettings.sortNewest || "الأحدث"}</option>
          <option>{siteSettings.sortPriceLow || "السعر: من الأقل"}</option>
          <option>{siteSettings.sortPriceHigh || "السعر: من الأعلى"}</option>
          <option>{siteSettings.sortBestSelling || "الأكثر مبيعاً"}</option>
        </select>
      </div>

      {/* Products Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[#999]">
          <div className="w-20 h-20 rounded-full bg-[#FFF8E8] flex items-center justify-center mx-auto mb-4 animate-float">
            <Package size={36} className="text-[#F0E0C0]" />
          </div>
          <p className="text-lg font-bold text-[#555]">{siteSettings.noProductsTitle || "لا توجد منتجات مطابقة"}</p>
          <p className="text-sm mt-1 text-[#999]">{siteSettings.noProductsDesc || "جرب كلمات بحث أخرى أو غير التصنيف"}</p>
        </div>
      ) : (
        <div className={
          isGrid
            ? "grid grid-cols-2 gap-2"
            : isMobile
            ? "flex flex-col gap-3"
            : "flex flex-col gap-5"
        }>
          {filtered.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ─── Cart Sheet ─── */
function CartSheet() {
  const { cart, products, cartOpen, setCartOpen, changeQty, removeFromCart, getCartTotal, setCurrentView, siteSettings, appliedCoupon, removeCoupon, getDiscountAmount, gifts } =
    useShopStore();

  const total = getCartTotal();
  const discount = getDiscountAmount();
  const finalTotal = Math.max(0, total - discount);
  const freeShipping = total >= 300;
  const shippingMissing = freeShipping ? 0 : 300 - total;

  // Sync gift items when cart or gifts change
  useEffect(() => {
    useShopStore.getState().syncGiftItems();
  }, [cart.length, gifts, total]);

  // Recalculate coupon discount when cart changes
  useEffect(() => {
    useShopStore.getState().recalculateCouponDiscount();
  }, [total]);

  // Coupon code state
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponSuccess, setCouponSuccess] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError("");
    setCouponSuccess(false);
    const code = couponCode.trim().toUpperCase();

    // First try API validation
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, cartTotal: total, cartItems: cart.filter(ci => !ci.isGift).map(ci => ({ id: ci.id, qty: ci.qty })) }),
      });
      const data = await res.json();
      if (data.valid) {
        useShopStore.getState().applyCoupon(data.coupon);
        setCouponSuccess(true);
        setCouponCode("");
        setTimeout(() => setCouponSuccess(false), 2000);
        setCouponLoading(false);
        return;
      } else {
        setCouponError(data.error || "كود الخصم غير صالح");
        setCouponLoading(false);
        return;
      }
    } catch {
      // API failed, try local validation as fallback
    }

    // Fallback: local coupon validation
    const coupons = useShopStore.getState().coupons;
    const localCoupon = coupons.find((c: Coupon) => c.code === code && c.active);
    if (!localCoupon) {
      setCouponError("كود الخصم غير صالح");
      setCouponLoading(false);
      return;
    }
    // Check expiry
    if (localCoupon.expiresAt && new Date(localCoupon.expiresAt) < new Date()) {
      setCouponError("كود الخصم منتهي الصلاحية");
      setCouponLoading(false);
      return;
    }
    // Check max uses
    if (localCoupon.maxUses > 0 && localCoupon.usedCount >= localCoupon.maxUses) {
      setCouponError("تم استخدام هذا الكود الحد الأقصى");
      setCouponLoading(false);
      return;
    }
    // Check minimum order
    if (localCoupon.minOrder > 0 && total < localCoupon.minOrder) {
      setCouponError(`الحد الأدنى للطلب ${localCoupon.minOrder} ج.م`);
      setCouponLoading(false);
      return;
    }
    // Calculate discount locally
    let discountAmount = 0;
    // Check product-specific applicability
    const couponProductIds = localCoupon.productIds || [];
    let applicableTotal = total;
    if (couponProductIds.length > 0) {
      const cartProducts = useShopStore.getState().products;
      applicableTotal = cart.filter(ci => !ci.isGift && couponProductIds.includes(ci.id)).reduce((sum, ci) => {
        const product = cartProducts.find(p => p.id === ci.id);
        if (!product) return sum;
        const fp = Math.round(product.price * (1 - (product.disc || 0) / 100));
        return sum + fp * ci.qty;
      }, 0);
      if (applicableTotal === 0) {
        setCouponError("هذا الكوبون لا ينطبق على المنتجات في سلتك");
        setCouponLoading(false);
        return;
      }
    }
    if (localCoupon.type === "percentage") {
      discountAmount = Math.round(applicableTotal * (localCoupon.value / 100));
    } else {
      discountAmount = Math.min(localCoupon.value, applicableTotal);
    }
    useShopStore.getState().applyCoupon({
      id: localCoupon.id,
      code: localCoupon.code,
      type: localCoupon.type as "percentage" | "fixed",
      value: localCoupon.value,
      minOrder: localCoupon.minOrder,
      productIds: couponProductIds,
      discountAmount,
    });
    setCouponSuccess(true);
    setCouponCode("");
    setTimeout(() => setCouponSuccess(false), 2000);
    setCouponLoading(false);
  };

  // Get qualified gifts (active gifts where cart total >= minOrder)
  const qualifiedGifts = useShopStore.getState().getQualifiedGifts();

  return (
    <Sheet open={cartOpen} onOpenChange={setCartOpen}>
      <SheetContent
        side="left"
        className="w-[85vw] sm:max-w-md bg-[#FFFBF0]/95 backdrop-blur-xl p-0 flex flex-col"
      >
        <SheetHeader className="p-4 border-b border-[#F0E0C0]">
          <SheetTitle className="text-right text-lg font-bold bg-gradient-to-l from-[#C85A00] to-[#F07800] bg-clip-text text-transparent flex items-center gap-2 justify-end">
            <ShoppingCart size={20} />
            {siteSettings.cartTitle || "سلة التسوق"}
          </SheetTitle>
        </SheetHeader>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-[#999] p-6">
            <div className="w-20 h-20 rounded-full bg-[#FFF8E8] flex items-center justify-center mb-4 animate-float">
              <ShoppingCart size={36} className="text-[#F0E0C0]" />
            </div>
            <p className="text-base font-bold text-[#555] mb-1">{siteSettings.cartEmptyTitle || "السلة فارغة"}</p>
            <p className="text-sm text-[#999]">{siteSettings.cartEmptyDesc || "أضف منتجات من الكتالوج"}</p>
          </div>
        ) : (
          <>
            {/* Free shipping bar */}
            <div className="px-4 py-3 bg-[#FFF8E8] border-b border-[#F0E0C0]">
              {freeShipping ? (
                <p className="text-sm text-[#2d8a4e] font-medium flex items-center gap-1">
                  <Truck size={14} />
                  🎉 {siteSettings.cartFreeShippingMsg || "واو! عندك توصيل مجاني"}
                </p>
              ) : (
                <div>
                  <p className="text-sm text-[#777]">
                    {siteSettings.cartShippingHint || "أضف منتجات بـ"}{" "}
                    <span className="font-bold text-[#C85A00]">
                      {formatPrice(shippingMissing)} ج.م
                    </span>{" "}
                    {siteSettings.cartSaveShipping || "ووفر مصاريف الشحن"}
                  </p>
                  <div className="w-full bg-[#F0E0C0] rounded-full h-1.5 mt-2">
                    <div
                      className="bg-[#F07800] h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min((total / 300) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
              {cart.map((ci, idx) => {
                const p = products.find((x) => x.id === ci.id);
                if (!p) return null;
                const fp = calcFinalPrice(p.price, p.disc);
                const cartKey = ci.isGift ? `gift-${ci.giftId || ci.id}-${idx}` : `item-${ci.id}`;
                return (
                  <div
                    key={cartKey}
                    className={`bg-white rounded-xl p-3 border flex gap-3 ${ci.isGift ? "border-[#2d8a4e]/30 bg-gradient-to-l from-[#EAF3DE]/30 to-white" : "border-[#F0E0C0]"}`}
                  >
                    <div className="w-16 h-16 rounded-lg bg-[#FFF8E8] flex-shrink-0 overflow-hidden flex items-center justify-center relative">
                      {p.img ? (
                        <img
                          src={p.img}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package size={24} className="text-[#F0E0C0]" />
                      )}
                      {ci.isGift && (
                        <div className="absolute top-0 left-0 w-5 h-5 bg-[#2d8a4e] rounded-br-lg flex items-center justify-center">
                          <GiftIcon size={10} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-[#1A1A1A] truncate">
                        {p.name}
                        {ci.isGift && <span className="mr-1 px-1.5 py-0.5 bg-[#EAF3DE] text-[#2d8a4e] text-[10px] rounded-full font-bold">هدية مجانية</span>}
                      </h4>
                      <p className="text-xs text-[#777] mt-0.5">
                        {ci.isGift ? (
                          <span className="text-[#2d8a4e] font-bold flex items-center gap-1"><GiftIcon size={12} /> مجاني - لا يدفع ثمنه</span>
                        ) : (
                          <>{formatPrice(fp)} ج.م × {ci.qty} = {formatPrice(fp * ci.qty)} ج.م</>
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {ci.isGift ? (
                          <span className="text-xs text-[#2d8a4e] font-medium">qty: 1</span>
                        ) : (
                          <>
                            <button
                              onClick={() => changeQty(p.id, -1)}
                              className="w-7 h-7 rounded-lg border border-[#F0E0C0] flex items-center justify-center text-[#F07800] hover:bg-[#F07800] hover:text-white transition"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="text-sm font-bold text-[#C85A00] min-w-[20px] text-center">
                              {ci.qty}
                            </span>
                            <button
                              onClick={() => changeQty(p.id, 1)}
                              className="w-7 h-7 rounded-lg border border-[#F0E0C0] flex items-center justify-center text-[#F07800] hover:bg-[#F07800] hover:text-white transition"
                            >
                              <Plus size={12} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => removeFromCart(p.id, ci.isGift)}
                          className="mr-auto text-[#ccc] hover:text-[#e24b4a] transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Coupon Code Section */}
            <div className="px-4 py-3 border-t border-[#F0E0C0]">
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-[#EAF3DE] rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Tag size={14} className="text-[#2d8a4e]" />
                    <span className="text-sm font-bold text-[#2d8a4e]">{appliedCoupon.code}</span>
                    <span className="text-xs text-[#3B6D11]">
                      {appliedCoupon.type === "percentage" ? `${appliedCoupon.value}%` : `${appliedCoupon.value} ج.م`} خصم
                    </span>
                    {discount > 0 && (
                      <span className="text-xs font-bold text-[#2d8a4e]">(-{formatPrice(discount)} ج.م)</span>
                    )}
                  </div>
                  <button onClick={() => removeCoupon()} className="text-[#999] hover:text-[#e24b4a] transition">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
                    onKeyDown={(e) => { if (e.key === "Enter" && couponCode.trim()) handleApplyCoupon(); }}
                    placeholder={siteSettings.couponPlaceholder || "أدخل كود الخصم"}
                    className="flex-1 px-3 py-2 bg-[#FFFBF0] border border-[#F0E0C0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F07800]/30"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="px-4 py-2 bg-[#F07800] hover:bg-[#C85A00] text-white rounded-xl text-sm font-medium transition disabled:opacity-50"
                  >
                    {couponLoading ? "..." : couponSuccess ? "✓" : siteSettings.couponApplyBtn || "تطبيق"}
                  </button>
                </div>
              )}
              {couponError && <p className="text-[#e24b4a] text-xs mt-1.5">{couponError}</p>}
              {couponSuccess && <p className="text-[#2d8a4e] text-xs mt-1.5">{siteSettings.couponAppliedMsg || "تم تطبيق الخصم!"}</p>}
            </div>

            {/* Qualified Gifts Notification */}
            {qualifiedGifts.length > 0 && (
              <div className="px-4 py-2 border-t border-[#F0E0C0]">
                {qualifiedGifts.map((g: Gift) => {
                  const giftProduct = products.find((p: Product) => p.id === g.productId);
                  if (!giftProduct) return null;
                  const isInCart = cart.some((ci: CartItem) => ci.giftId === g.id);
                  const triggerIds = (g.triggerProductIds as number[]) || [];
                  const triggerNames = triggerIds.length > 0
                    ? products.filter((p) => triggerIds.includes(p.id)).map(p => p.name).join("، ")
                    : "";
                  return (
                    <div key={g.id} className="bg-gradient-to-l from-[#EAF3DE] to-[#D4EDBC] rounded-xl px-3 py-2.5 mb-1.5 last:mb-0 border border-[#2d8a4e]/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#2d8a4e] flex items-center justify-center">
                            <GiftIcon size={14} className="text-white" />
                          </div>
                          <div>
                            <span className="text-sm font-bold text-[#2d8a4e]">{siteSettings.giftLabel || "هدية مجانية!"}</span>
                            <span className="text-xs text-[#555] mr-1">{giftProduct.name}</span>
                          </div>
                        </div>
                        {isInCart ? (
                          <span className="text-xs text-[#2d8a4e] font-bold flex items-center gap-1"><CheckCircle size={12} /> تمت الإضافة</span>
                        ) : (
                          <span className="text-xs text-[#2d8a4e]">جاري الإضافة...</span>
                        )}
                      </div>
                      {triggerNames && (
                        <p className="text-[10px] text-[#2d8a4e]/70 mt-1 mr-9">بسبب شراء: {triggerNames}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            <SheetFooter className="p-4 border-t border-[#F0E0C0] bg-white space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-sm text-[#777]">
                  <span>{siteSettings.cartItemCount || "عدد المنتجات"}</span>
                  <span>
                    {cart.reduce((s, i) => s + i.qty, 0)} قطعة
                  </span>
                </div>
                <div className="flex justify-between text-sm text-[#777]">
                  <span>{siteSettings.cartShipping || "الشحن"}</span>
                  <span className={freeShipping ? "text-[#2d8a4e]" : ""}>
                    {freeShipping ? `${siteSettings.cartFreeText || "مجاني"} 🎉` : siteSettings.cartShippingLater || "يُحدد لاحقاً"}
                  </span>
                </div>
                {appliedCoupon && discount > 0 && (
                  <div className="flex justify-between text-sm text-[#2d8a4e]">
                    <span>{siteSettings.couponDiscountLabel || "الخصم"} ({appliedCoupon.code})</span>
                    <span>-{formatPrice(discount)} ج.م</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-[#C85A00] text-lg">
                  <span>{siteSettings.cartTotal || "الإجمالي"}</span>
                  <span>{formatPrice(finalTotal)} ج.م</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setCartOpen(false);
                  useShopStore.getState().navigateTo("checkout");
                }}
                className="w-full btn-luxury bg-gradient-to-l from-[#F07800] to-[#C85A00] text-white font-bold py-3 rounded-xl transition text-sm shadow-lg shadow-[#F07800]/20"
              >
                {siteSettings.cartCheckoutBtn || "إتمام الطلب ←"}
              </button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ─── Checkout ─── */
function CheckoutPage() {
  const { cart, products, getCartTotal, addOrder, clearCart, setCurrentView, setLastOrderId, setLastOrderName, siteSettings, appliedCoupon, getDiscountAmount, gifts } =
    useShopStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gov, setGov] = useState("");
  const [addr, setAddr] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const total = getCartTotal();
  const discount = getDiscountAmount();
  const finalTotal = Math.max(0, total - discount);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = siteSettings.errorNameRequired || "الاسم مطلوب";
    if (!phone.trim()) e.phone = siteSettings.errorPhoneRequired || "رقم التليفون مطلوب";
    else if (!/^01[0-9]{9}$/.test(phone.trim()))
      e.phone = siteSettings.errorPhoneInvalid || "رقم التليفون مش صحيح (01xxxxxxxxx)";
    if (!gov) e.gov = siteSettings.errorGovRequired || "اختار المحافظة";
    if (!addr.trim()) e.addr = siteSettings.errorAddrRequired || "العنوان مطلوب";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const orderId = "#ORD-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const currentAppliedCoupon = useShopStore.getState().appliedCoupon;
    const order: Order = {
      id: orderId,
      name: name.trim(),
      phone: phone.trim(),
      gov,
      addr: addr.trim(),
      notes: notes.trim(),
      items: [...cart],
      total: finalTotal,
      date: new Date().toLocaleDateString("ar-EG"),
      status: "جديد",
    };
    addOrder(order);

    // Increment coupon usedCount if coupon was applied
    if (currentAppliedCoupon) {
      // Update local coupon usedCount
      const coupons = useShopStore.getState().coupons;
      const couponData = coupons.find((c: Coupon) => c.id === currentAppliedCoupon.id);
      if (couponData) {
        useShopStore.getState().updateCoupon(currentAppliedCoupon.id, {
          usedCount: couponData.usedCount + 1,
        });
      }
    }

    setLastOrderId(orderId);
    setLastOrderName(name.trim());
    clearCart();
    useShopStore.getState().navigateTo("success");
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <ShoppingCart size={48} className="mx-auto text-[#ccc] mb-3" />
        <p className="text-[#999] text-lg">{siteSettings.cartEmptyTitle || "السلة فارغة"}</p>
        <button
          onClick={() => useShopStore.getState().navigateTo("catalog")}
          className="mt-4 text-[#F07800] font-medium hover:underline"
        >
          ← {siteSettings.checkoutContinueShopping || "متابعة التسوق"}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <button
        onClick={() => useShopStore.getState().navigateTo("catalog")}
        className="text-[#777] hover:text-[#F07800] text-sm mb-4 flex items-center gap-1 transition"
      >
        <ArrowRight size={16} />
        {siteSettings.checkoutContinueShopping || "متابعة التسوق"}
      </button>

      <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">{siteSettings.checkoutTitle || "بيانات الطلب"}</h2>

      {/* Checkout Step Indicator */}
      <div className="flex items-center justify-center gap-0 mb-6">
        {[
          { label: siteSettings.checkoutStepCart || "السلة", icon: <ShoppingCart size={14} />, done: true },
          { label: siteSettings.checkoutStepInfo || "البيانات", icon: <ClipboardList size={14} />, done: false, active: true },
          { label: siteSettings.checkoutStepConfirm || "التأكيد", icon: <CheckCircle size={14} />, done: false },
        ].map((step, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <div className={`w-10 h-[2px] ${i <= 1 ? "bg-gradient-to-l from-[#F07800] to-[#F5C400]" : "bg-[#F0E0C0]"}`} />
            )}
            <div className={`flex flex-col items-center gap-1 ${step.done ? "text-[#2d8a4e]" : step.active ? "text-[#F07800]" : "text-[#ccc]"}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                step.done 
                  ? "bg-[#EAF3DE] border-[#2d8a4e]" 
                  : step.active 
                  ? "bg-[#FFF3C4] border-[#F07800] step-active-glow" 
                  : "bg-white border-[#F0E0C0]"
              }`}>
                {step.done ? <CheckCircle size={14} /> : step.icon}
              </div>
              <span className="text-[10px] font-medium">{step.label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Order Summary */}
      <div className="bg-white rounded-2xl border border-[#F0E0C0] p-4 mb-4">
        <h3 className="text-sm font-bold text-[#C85A00] mb-3">{siteSettings.checkoutSummaryTitle || "ملخص الطلب"}</h3>
        {cart.map((ci, idx) => {
          const p = products.find((x) => x.id === ci.id);
          if (!p) return null;
          const fp = calcFinalPrice(p.price, p.disc);
          const cartKey = ci.isGift ? `gift-${ci.giftId || ci.id}-${idx}` : `item-${ci.id}`;
          return (
            <div
              key={cartKey}
              className="flex justify-between text-sm py-1.5 border-b border-[#F0E0C0] last:border-0"
            >
              <span className="text-[#555]">
                {ci.isGift && <GiftIcon size={12} className="inline text-[#2d8a4e] ml-1" />}
                {p.name} × {ci.qty}
                {ci.isGift && <span className="text-[#2d8a4e] text-xs mr-1">(هدية)</span>}
              </span>
              <span className="font-medium">{ci.isGift ? <span className="text-[#2d8a4e]">مجاني</span> : `${formatPrice(fp * ci.qty)} ج.م`}</span>
            </div>
          );
        })}
        {appliedCoupon && discount > 0 && (
          <div className="flex justify-between text-sm py-1.5 text-[#2d8a4e]">
            <span className="flex items-center gap-1"><Tag size={12} /> {siteSettings.couponDiscountLabel || "الخصم"} ({appliedCoupon.code})</span>
            <span>-{formatPrice(discount)} ج.م</span>
          </div>
        )}
        <Separator className="my-2" />
        <div className="flex justify-between font-bold text-[#C85A00]">
          <span>{siteSettings.cartTotal || "الإجمالي"}</span>
          <span>{formatPrice(finalTotal)} ج.م</span>
        </div>
      </div>

      {/* Payment Method Badge */}
      <div className="bg-[#EAF3DE] rounded-2xl p-4 mb-4 flex items-start gap-3">
        <CreditCard size={20} className="text-[#2d8a4e] mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-bold text-[#2d8a4e] text-sm">
            {siteSettings.checkoutCODTitle || "الدفع عند الاستلام فقط"}
          </p>
          <p className="text-xs text-[#3B6D11] mt-0.5">
            {siteSettings.checkoutCODDesc || "هتستلم المنتج وتتأكد إنه أصلي وبعدين تدفع — مفيش أي مخاطرة!"}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-[#F0E0C0] p-4 space-y-4">
        <div>
          <label className="text-sm text-[#555] mb-1.5 block">{siteSettings.checkoutNameLabel || "الاسم الكامل"} *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={siteSettings.checkoutNamePlaceholder || "مثال: محمد أحمد"}
            className={`w-full px-4 py-2.5 bg-[#FFFBF0] border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F07800]/30 transition ${
              errors.name ? "border-[#e24b4a]" : "border-[#F0E0C0]"
            }`}
          />
          {errors.name && (
            <p className="text-[#e24b4a] text-xs mt-1">{errors.name}</p>
          )}
        </div>

        <div>
          <label className="text-sm text-[#555] mb-1.5 block">
            {siteSettings.checkoutPhoneLabel || "رقم التليفون"} *
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01xxxxxxxxx"
            className={`w-full px-4 py-2.5 bg-[#FFFBF0] border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F07800]/30 transition ${
              errors.phone ? "border-[#e24b4a]" : "border-[#F0E0C0]"
            }`}
          />
          {errors.phone && (
            <p className="text-[#e24b4a] text-xs mt-1">{errors.phone}</p>
          )}
        </div>

        <div>
          <label className="text-sm text-[#555] mb-1.5 block">{siteSettings.checkoutGovLabel || "المحافظة"} *</label>
          <select
            value={gov}
            onChange={(e) => setGov(e.target.value)}
            className={`w-full px-4 py-2.5 bg-[#FFFBF0] border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F07800]/30 transition cursor-pointer ${
              errors.gov ? "border-[#e24b4a]" : "border-[#F0E0C0]"
            }`}
          >
            <option value="">{siteSettings.checkoutGovPlaceholder || "اختار المحافظة"}</option>
            {EGYPTIAN_GOVERNORATES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          {errors.gov && (
            <p className="text-[#e24b4a] text-xs mt-1">{errors.gov}</p>
          )}
        </div>

        <div>
          <label className="text-sm text-[#555] mb-1.5 block">
            {siteSettings.checkoutAddrLabel || "العنوان بالتفصيل"} *
          </label>
          <textarea
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            placeholder={siteSettings.checkoutAddrPlaceholder || "الحي، الشارع، رقم العمارة..."}
            rows={2}
            className={`w-full px-4 py-2.5 bg-[#FFFBF0] border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F07800]/30 transition resize-none ${
              errors.addr ? "border-[#e24b4a]" : "border-[#F0E0C0]"
            }`}
          />
          {errors.addr && (
            <p className="text-[#e24b4a] text-xs mt-1">{errors.addr}</p>
          )}
        </div>

        <div>
          <label className="text-sm text-[#555] mb-1.5 block">
            {siteSettings.checkoutNotesLabel || "ملاحظات (اختياري)"}
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={siteSettings.checkoutNotesPlaceholder || "أي طلبات خاصة..."}
            className="w-full px-4 py-2.5 bg-[#FFFBF0] border border-[#F0E0C0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F07800]/30 transition"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => useShopStore.getState().setCartOpen(true)}
          className="flex-1 border-2 border-[#F07800] text-[#F07800] font-medium py-3 rounded-xl hover:bg-[#FFF8E8] transition-all duration-300 text-sm"
        >
          → {siteSettings.checkoutBackToCart || "رجوع للسلة"}
        </button>
        <button
          onClick={handleSubmit}
          className="flex-[2] btn-luxury bg-gradient-to-l from-[#F07800] to-[#C85A00] text-white font-bold py-3 rounded-xl transition text-sm shadow-lg shadow-[#F07800]/20"
        >
          {siteSettings.checkoutConfirmBtn || "تأكيد الطلب"} ✓
        </button>
      </div>
    </div>
  );
}

/* ─── Success Page ─── */
function SuccessPage() {
  const { lastOrderId, lastOrderName, setCurrentView, setInvoiceOrderId, setInvoiceOpen, siteSettings } = useShopStore();

  return (
    <div className="max-w-lg mx-auto px-4 py-12 text-center relative">
      <ConfettiEffect />
      <div
        className="w-24 h-24 rounded-full bg-gradient-to-bl from-[#EAF3DE] to-[#D4EDBC] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#2d8a4e]/20 animate-bounce-in relative star-burst"
      >
        <CheckCircle size={44} className="text-[#2d8a4e]" />
      </div>
      <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>{siteSettings.successTitle || "تم استلام طلبك!"}</h2>
      <p className="text-[#777] text-sm mb-6 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
        {siteSettings.successMsg || "شكراً"} <strong>{lastOrderName}</strong>{siteSettings.successMsg2 || "! طلبك رقم"}{" "}
        <strong className="bg-gradient-to-l from-[#C85A00] to-[#F07800] bg-clip-text text-transparent">{lastOrderId}</strong> {siteSettings.successMsg3 || "اتسجل بنجاح."}
        <br />
        {siteSettings.successMsg4 || "هنتواصل معاك على التليفون لتأكيد الطلب ومواعيد التوصيل."}
      </p>

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-[#F0E0C0] p-4 text-right mb-6 shadow-sm animate-slide-up" style={{ animationDelay: '0.5s' }}>
        <div className="flex justify-between py-1.5">
          <span className="text-[#777] text-sm">{siteSettings.successOrderNum || "رقم الطلب"}</span>
          <span className="font-bold text-[#C85A00] text-sm">{lastOrderId}</span>
        </div>
        <div className="divider-diamond"><span>◆</span></div>
        <div className="flex justify-between py-1.5">
          <span className="text-[#777] text-sm">{siteSettings.successPaymentMethod || "طريقة الدفع"}</span>
          <span className="font-medium text-sm flex items-center gap-1"><CreditCard size={14} className="text-[#2d8a4e]" /> {siteSettings.successCODLabel || "الدفع عند الاستلام"}</span>
        </div>
        <div className="divider-diamond"><span>◆</span></div>
        <div className="flex justify-between py-1.5">
          <span className="text-[#777] text-sm">{siteSettings.successDeliveryLabel || "التوصيل"}</span>
          <span className="font-medium text-sm flex items-center gap-1"><Truck size={14} className="text-[#F07800]" /> {siteSettings.successDeliveryTime || "خلال 4 أيام"}</span>
        </div>
      </div>

      <div className="glass-gold rounded-2xl p-4 text-right mb-6 animate-slide-up" style={{ animationDelay: '0.6s' }}>
        <p className="text-sm text-[#777] flex items-start gap-2">
          <Info size={16} className="text-[#F07800] mt-0.5 flex-shrink-0" />
          {siteSettings.successContactMsg || "تقدر تتواصل معانا على صفحتنا على فيسبوك"}{" "}
          {siteSettings.messengerUrl ? (
            <a
              href={siteSettings.messengerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0084FF] font-bold hover:underline inline-flex items-center gap-1"
            >
              <MessageCircle size={14} />
              ماسنجر
            </a>
          ) : (
            <span>"صيدليتي"</span>
          )}{" "}
          لو عندك أي استفسار
        </p>
      </div>

      <button
        onClick={() => useShopStore.getState().navigateTo("catalog")}
        className="btn-luxury bg-gradient-to-l from-[#F07800] to-[#C85A00] text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-[#F07800]/20 animate-slide-up"
        style={{ animationDelay: '0.7s' }}
      >
        ← {siteSettings.successContinueBtn || "متابعة التسوق"}
      </button>
    </div>
  );
}

/* ─── Admin Password Dialog ─── */
function AdminPasswordDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const { setAdminUnlocked, setCurrentView, setAdminTab } = useShopStore();

  const handleSubmit = () => {
    if (password === ADMIN_PASSWORD) {
      setAdminUnlocked(true);
      setAdminTab("appearance");
      useShopStore.getState().navigateTo("admin");
      setPassword("");
      setError(false);
      onClose();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-right flex items-center gap-2 justify-end">
            <Shield size={18} className="text-[#F07800]" />
            الدخول للوحة التحكم
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs text-[#777] mb-1.5 block">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className={`w-full px-4 py-2.5 border rounded-xl text-sm bg-[#FFFBF0] focus:outline-none focus:ring-2 focus:ring-[#F07800]/30 transition text-center tracking-widest ${
                error ? "border-[#e24b4a] animate-shake" : "border-[#F0E0C0]"
              }`}
              placeholder="••••••"
              autoFocus
            />
            {error && (
              <p className="text-[#e24b4a] text-xs mt-1.5 text-center font-medium">
                كلمة المرور غير صحيحة
              </p>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-[#F0E0C0] rounded-lg text-sm text-[#777] hover:bg-[#FFF8E8] transition"
            >
              إلغاء
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-[#F07800] hover:bg-[#C85A00] text-white rounded-lg text-sm font-medium transition"
            >
              دخول
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Admin Login Screen (full page for /admin URL) ─── */
function AdminLoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const { setAdminTab } = useShopStore();

  const handleSubmit = () => {
    if (password === ADMIN_PASSWORD) {
      setAdminTab("appearance");
      onSuccess();
      setPassword("");
      setError(false);
    } else {
      setError(true);
      setShakeKey((k) => k + 1);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-3xl border border-[#F0E0C0] shadow-xl shadow-[#F07800]/5 p-8 text-center">
          {/* Lock Icon */}
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-bl from-[#F07800] to-[#C85A00] flex items-center justify-center shadow-lg shadow-[#F07800]/30">
            <Shield size={36} className="text-white" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">لوحة التحكم</h2>
          <p className="text-sm text-[#888] mb-6">أدخل كلمة المرور للدخول</p>

          {/* Password Input */}
          <div key={shakeKey} className={error ? "animate-shake" : ""}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className={`w-full px-5 py-3.5 border-2 rounded-xl text-lg bg-[#FFFBF0] focus:outline-none focus:ring-2 focus:ring-[#F07800]/30 transition text-center tracking-[0.3em] font-mono ${
                error ? "border-[#e24b4a] bg-[#FFF0F0]" : "border-[#F0E0C0]"
              }`}
              placeholder="••••••"
              autoFocus
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[#e24b4a]">
              <AlertCircle size={14} />
              <p className="text-xs font-medium">كلمة المرور غير صحيحة</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            className="w-full mt-5 py-3.5 bg-gradient-to-l from-[#F07800] to-[#C85A00] hover:from-[#C85A00] hover:to-[#A04800] text-white rounded-xl font-bold text-base shadow-lg shadow-[#F07800]/25 hover:shadow-xl hover:shadow-[#F07800]/35 transition-all active:scale-[0.98]"
          >
            دخول
          </button>

          {/* Back to Store */}
          <button
            onClick={() => useShopStore.getState().navigateTo("catalog")}
            className="mt-4 text-sm text-[#888] hover:text-[#F07800] transition-colors flex items-center justify-center gap-1.5 mx-auto"
          >
            <ArrowRight size={14} />
            الرجوع للمتجر
          </button>
        </div>

        {/* Subtle branding */}
        <p className="text-center text-[10px] text-[#ccc] mt-4">صيدليتي — لوحة التحكم</p>
      </div>
    </div>
  );
}

/* ─── Text Setting Field Helper ─── */
function TextSettingField({ label, field, placeholder, multiline = false }: { label: string; field: keyof SiteSettings; placeholder: string; multiline?: boolean }) {
  // Must use useShopStore() hook (not getState) so the component re-renders on state changes
  const siteSettings = useShopStore((s) => s.siteSettings);
  const updateSiteSetting = useShopStore((s) => s.updateSiteSetting);
  const val = (siteSettings[field] as string) || "";
  const Comp = multiline ? "textarea" : "input";
  return (
    <div>
      <label className="text-xs text-[#777] mb-1 block">{label}</label>
      <Comp
        value={val}
        onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateSiteSetting(field, e.target.value)}
        placeholder={placeholder}
        rows={multiline ? 3 : undefined}
        className="w-full px-3 py-2 border border-[#F0E0C0] rounded-xl text-sm bg-[#FFFBF0] focus:outline-none focus:ring-2 focus:ring-[#F07800]/30 resize-none"
      />
    </div>
  );
}

/* ─── Coupon Admin Tab ─── */
function CouponAdminTab() {
  const { coupons, products } = useShopStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    code: "",
    type: "percentage" as "percentage" | "fixed",
    value: "",
    minOrder: "",
    maxUses: "",
    expiresAt: "",
    active: true,
    applyToAll: true,
    productIds: [] as number[],
  });

  const openAddModal = () => {
    setEditId(null);
    setForm({ code: "", type: "percentage", value: "", minOrder: "", maxUses: "", expiresAt: "", active: true, applyToAll: true, productIds: [] });
    setModalOpen(true);
  };

  const openEditModal = (c: Coupon) => {
    setEditId(c.id);
    const pids = c.productIds || [];
    setForm({
      code: c.code,
      type: c.type as "percentage" | "fixed",
      value: c.value.toString(),
      minOrder: c.minOrder.toString(),
      maxUses: c.maxUses.toString(),
      expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().split("T")[0] : "",
      active: c.active,
      applyToAll: pids.length === 0,
      productIds: pids,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.code.trim()) return;
    const data = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value) || 0,
      minOrder: Number(form.minOrder) || 0,
      maxUses: Number(form.maxUses) || 0,
      expiresAt: form.expiresAt || null,
      productIds: form.applyToAll ? [] : form.productIds,
      active: form.active,
    };
    if (editId) {
      useShopStore.getState().updateCoupon(editId, data);
    } else {
      useShopStore.getState().addCoupon({ ...data, id: Date.now(), usedCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Coupon);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذا الكوبون؟")) {
      useShopStore.getState().deleteCoupon(id);
    }
  };

  const handleToggleActive = (c: Coupon) => {
    useShopStore.getState().updateCoupon(c.id, { active: !c.active });
  };

  const toggleProduct = (pid: number) => {
    setForm(prev => ({
      ...prev,
      productIds: prev.productIds.includes(pid)
        ? prev.productIds.filter(id => id !== pid)
        : [...prev.productIds, pid],
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm text-[#C85A00] flex items-center gap-2">
          <Tag size={16} /> كوبونات الخصم ({coupons.length})
        </h3>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-[#F07800] hover:bg-[#C85A00] text-white rounded-xl text-sm font-medium transition flex items-center gap-1.5"
        >
          <Plus size={14} /> إضافة كوبون
        </button>
      </div>

      {coupons.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#F0E0C0] p-8 text-center">
          <Tag size={36} className="mx-auto text-[#F0E0C0] mb-3" />
          <p className="text-[#999] text-sm">لا توجد كوبونات حالياً</p>
          <p className="text-[#bbb] text-xs mt-1">أضف كوبون خصم لجذب العملاء</p>
        </div>
      ) : (
        <div className="space-y-2">
          {coupons.map((c) => (
            <div key={c.id} className={`bg-white rounded-xl border border-[#F0E0C0] p-4 flex items-center justify-between ${!c.active ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.active ? "bg-[#FFF3C4]" : "bg-[#F0E0C0]"}`}>
                  <Tag size={18} className={c.active ? "text-[#C85A00]" : "text-[#999]"} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#1A1A1A]">{c.code}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.type === "percentage" ? "bg-[#EAF3DE] text-[#2d8a4e]" : "bg-[#FFF3C4] text-[#C85A00]"}`}>
                      {c.type === "percentage" ? `${c.value}%` : `${c.value} ج.م`}
                    </span>
                    {!c.active && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F0E0C0] text-[#999]">معطل</span>}
                    {(c.productIds && c.productIds.length > 0) && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EDE9FE] text-[#7C3AED]">
                        {c.productIds.length} منتج
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-[#999]">
                    {c.minOrder > 0 && <span>الحد الأدنى: {c.minOrder} ج.م</span>}
                    {c.maxUses > 0 && <span>استخدام: {c.usedCount}/{c.maxUses}</span>}
                    {c.maxUses === 0 && <span>استخدام: {c.usedCount}/∞</span>}
                    {c.expiresAt && <span>ينتهي: {new Date(c.expiresAt).toLocaleDateString("ar-EG")}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleToggleActive(c)}
                  className={`p-1.5 rounded-lg transition ${c.active ? "text-[#2d8a4e] hover:bg-[#EAF3DE]" : "text-[#999] hover:bg-[#F0E0C0]"}`}
                  title={c.active ? "تعطيل" : "تفعيل"}
                >
                  {c.active ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button onClick={() => openEditModal(c)} className="p-1.5 text-[#999] hover:text-[#F07800] hover:bg-[#FFF8E8] rounded-lg transition">
                  <Edit size={16} />
                </button>
                <button onClick={() => handleDelete(c.id)} className="p-1.5 text-[#ccc] hover:text-[#e24b4a] hover:bg-[#FFF0F0] rounded-lg transition">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Coupon Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl border border-[#F0E0C0] shadow-2xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col animate-scale-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#FFF8E8] p-4 border-b border-[#F0E0C0] flex items-center justify-between flex-shrink-0">
              <h3 className="font-bold text-sm text-[#C85A00] flex items-center gap-2">
                <Tag size={16} /> {editId ? "تعديل كوبون" : "إضافة كوبون"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-[#999] hover:text-[#C85A00] transition"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar">
              <div>
                <label className="text-xs text-[#777] mb-1 block">كود الخصم *</label>
                <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="مثال: SAVE10" className="w-full px-3 py-2 border border-[#F0E0C0] rounded-xl text-sm bg-[#FFFBF0] focus:outline-none focus:ring-2 focus:ring-[#F07800]/30 font-mono tracking-wider" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#777] mb-1 block">نوع الخصم</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "percentage" | "fixed" })} className="w-full px-3 py-2 border border-[#F0E0C0] rounded-xl text-sm bg-[#FFFBF0] focus:outline-none cursor-pointer">
                    <option value="percentage">نسبة مئوية %</option>
                    <option value="fixed">مبلغ ثابت ج.م</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#777] mb-1 block">قيمة الخصم *</label>
                  <input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder={form.type === "percentage" ? "10" : "50"} className="w-full px-3 py-2 border border-[#F0E0C0] rounded-xl text-sm bg-[#FFFBF0] focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#777] mb-1 block">الحد الأدنى للطلب (ج.م)</label>
                  <input type="number" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} placeholder="0 = بدون حد" className="w-full px-3 py-2 border border-[#F0E0C0] rounded-xl text-sm bg-[#FFFBF0] focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-[#777] mb-1 block">الحد الأقصى للاستخدام</label>
                  <input type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} placeholder="0 = بدون حد" className="w-full px-3 py-2 border border-[#F0E0C0] rounded-xl text-sm bg-[#FFFBF0] focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-[#777] mb-1 block">تاريخ الانتهاء (اختياري)</label>
                <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="w-full px-3 py-2 border border-[#F0E0C0] rounded-xl text-sm bg-[#FFFBF0] focus:outline-none" />
              </div>

              {/* Product Selection */}
              <div className="border border-[#F0E0C0] rounded-xl p-3 bg-[#FFFBF0]">
                <div className="flex items-center gap-2 mb-2">
                  <input type="checkbox" checked={form.applyToAll} onChange={(e) => setForm({ ...form, applyToAll: e.target.checked, productIds: e.target.checked ? [] : form.productIds })} className="w-4 h-4 accent-[#F07800]" />
                  <label className="text-xs font-medium text-[#555]">تطبيق على جميع المنتجات</label>
                </div>
                {!form.applyToAll && (
                  <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1 border-t border-[#F0E0C0] pt-2">
                    {products.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#FFF8E8] cursor-pointer transition">
                        <input
                          type="checkbox"
                          checked={form.productIds.includes(p.id)}
                          onChange={() => toggleProduct(p.id)}
                          className="w-3.5 h-3.5 accent-[#F07800]"
                        />
                        <span className="text-xs text-[#555] truncate flex-1">{p.name}</span>
                        <span className="text-[10px] text-[#999]">{calcFinalPrice(p.price, p.disc)} ج.م</span>
                      </label>
                    ))}
                    {form.productIds.length === 0 && (
                      <p className="text-[10px] text-[#e24b4a] text-center py-1">اختار منتج واحد على الأقل</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4 accent-[#F07800]" />
                <label className="text-xs text-[#555]">مفعّل</label>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setModalOpen(false)} className="px-4 py-2 border border-[#F0E0C0] rounded-lg text-sm text-[#777] hover:bg-[#FFF8E8] transition">إلغاء</button>
                <button onClick={handleSave} disabled={!form.applyToAll && form.productIds.length === 0} className="px-6 py-2 bg-[#F07800] hover:bg-[#C85A00] text-white rounded-lg text-sm font-medium transition disabled:opacity-50">{editId ? "حفظ التعديلات" : "إضافة"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Gift Admin Tab ─── */
function GiftAdminTab() {
  const { gifts, products } = useShopStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    productId: "",
    minOrder: "",
    active: true,
    triggerAll: true,
    triggerProductIds: [] as number[],
  });

  const openAddModal = () => {
    setEditId(null);
    setForm({ name: "", description: "", productId: "", minOrder: "", active: true, triggerAll: true, triggerProductIds: [] });
    setModalOpen(true);
  };

  const openEditModal = (g: Gift) => {
    setEditId(g.id);
    const tids = g.triggerProductIds || [];
    setForm({
      name: g.name,
      description: g.description,
      productId: g.productId.toString(),
      minOrder: g.minOrder.toString(),
      active: g.active,
      triggerAll: tids.length === 0,
      triggerProductIds: tids,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.productId) return;
    const data = {
      name: form.name.trim(),
      description: form.description.trim(),
      productId: Number(form.productId),
      minOrder: Number(form.minOrder) || 0,
      triggerProductIds: form.triggerAll ? [] : form.triggerProductIds,
      active: form.active,
    };
    if (editId) {
      useShopStore.getState().updateGift(editId, data);
    } else {
      useShopStore.getState().addGift({ ...data, id: Date.now(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Gift);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذه الهدية؟")) {
      useShopStore.getState().deleteGift(id);
    }
  };

  const handleToggleActive = (g: Gift) => {
    useShopStore.getState().updateGift(g.id, { active: !g.active });
  };

  const toggleTriggerProduct = (pid: number) => {
    setForm(prev => ({
      ...prev,
      triggerProductIds: prev.triggerProductIds.includes(pid)
        ? prev.triggerProductIds.filter(id => id !== pid)
        : [...prev.triggerProductIds, pid],
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm text-[#C85A00] flex items-center gap-2">
          <GiftIcon size={16} /> الهدايا المجانية ({gifts.length})
        </h3>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-[#F07800] hover:bg-[#C85A00] text-white rounded-xl text-sm font-medium transition flex items-center gap-1.5"
        >
          <Plus size={14} /> إضافة هدية
        </button>
      </div>

      {gifts.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#F0E0C0] p-8 text-center">
          <GiftIcon size={36} className="mx-auto text-[#F0E0C0] mb-3" />
          <p className="text-[#999] text-sm">لا توجد هدايا حالياً</p>
          <p className="text-[#bbb] text-xs mt-1">أضف هدية مجانية لتحفيز العملاء على الشراء</p>
        </div>
      ) : (
        <div className="space-y-2">
          {gifts.map((g) => {
            const giftProduct = products.find((p) => p.id === g.productId);
            const triggerNames = (g.triggerProductIds || []).length > 0
              ? (g.triggerProductIds as number[]).map(tid => products.find(p => p.id === tid)?.name).filter(Boolean).join("، ")
              : "أي منتج";
            return (
              <div key={g.id} className={`bg-white rounded-xl border border-[#F0E0C0] p-4 flex items-center justify-between ${!g.active ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${g.active ? "bg-[#FFF3C4]" : "bg-[#F0E0C0]"}`}>
                    <GiftIcon size={18} className={g.active ? "text-[#C85A00]" : "text-[#999]"} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#1A1A1A]">{g.name}</span>
                      {!g.active && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F0E0C0] text-[#999]">معطل</span>}
                      {(g.triggerProductIds && (g.triggerProductIds as number[]).length > 0) && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EDE9FE] text-[#7C3AED]">
                          {(g.triggerProductIds as number[]).length} منتج مشغّل
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-[#999]">
                      <span>الهدية: {giftProduct?.name || "محذوف"}</span>
                      <span>عند شراء: {triggerNames}</span>
                      {g.minOrder > 0 && <span>الحد الأدنى: {g.minOrder} ج.م</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleActive(g)}
                    className={`p-1.5 rounded-lg transition ${g.active ? "text-[#2d8a4e] hover:bg-[#EAF3DE]" : "text-[#999] hover:bg-[#F0E0C0]"}`}
                    title={g.active ? "تعطيل" : "تفعيل"}
                  >
                    {g.active ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button onClick={() => openEditModal(g)} className="p-1.5 text-[#999] hover:text-[#F07800] hover:bg-[#FFF8E8] rounded-lg transition">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(g.id)} className="p-1.5 text-[#ccc] hover:text-[#e24b4a] hover:bg-[#FFF0F0] rounded-lg transition">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Gift Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl border border-[#F0E0C0] shadow-2xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col animate-scale-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#FFF8E8] p-4 border-b border-[#F0E0C0] flex items-center justify-between flex-shrink-0">
              <h3 className="font-bold text-sm text-[#C85A00] flex items-center gap-2">
                <GiftIcon size={16} /> {editId ? "تعديل هدية" : "إضافة هدية"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-[#999] hover:text-[#C85A00] transition"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar">
              <div>
                <label className="text-xs text-[#777] mb-1 block">اسم الهدية *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: هدية الطلب الأول" className="w-full px-3 py-2 border border-[#F0E0C0] rounded-xl text-sm bg-[#FFFBF0] focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-[#777] mb-1 block">المنتج المجاني (الهدية) *</label>
                <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} className="w-full px-3 py-2 border border-[#F0E0C0] rounded-xl text-sm bg-[#FFFBF0] focus:outline-none cursor-pointer">
                  <option value="">اختار المنتج</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({calcFinalPrice(p.price, p.disc)} ج.م)</option>
                  ))}
                </select>
              </div>

              {/* Trigger Products Selection */}
              <div className="border border-[#F0E0C0] rounded-xl p-3 bg-[#FFFBF0]">
                <label className="text-xs font-medium text-[#555] mb-2 block">متى تُقدَّم الهدية؟</label>
                <div className="flex items-center gap-2 mb-2">
                  <input type="checkbox" checked={form.triggerAll} onChange={(e) => setForm({ ...form, triggerAll: e.target.checked, triggerProductIds: e.target.checked ? [] : form.triggerProductIds })} className="w-4 h-4 accent-[#F07800]" />
                  <label className="text-xs font-medium text-[#555]">عند شراء أي منتج</label>
                </div>
                {!form.triggerAll && (
                  <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1 border-t border-[#F0E0C0] pt-2">
                    <p className="text-[10px] text-[#777] mb-1">اختار المنتجات اللي لما العميل يشتريها هيحصل على الهدية:</p>
                    {products.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#FFF8E8] cursor-pointer transition">
                        <input
                          type="checkbox"
                          checked={form.triggerProductIds.includes(p.id)}
                          onChange={() => toggleTriggerProduct(p.id)}
                          className="w-3.5 h-3.5 accent-[#F07800]"
                        />
                        <span className="text-xs text-[#555] truncate flex-1">{p.name}</span>
                        <span className="text-[10px] text-[#999]">{calcFinalPrice(p.price, p.disc)} ج.م</span>
                      </label>
                    ))}
                    {form.triggerProductIds.length === 0 && (
                      <p className="text-[10px] text-[#e24b4a] text-center py-1">اختار منتج واحد على الأقل</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-[#777] mb-1 block">الحد الأدنى للطلب (ج.م)</label>
                <input type="number" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} placeholder="0 = بدون حد" className="w-full px-3 py-2 border border-[#F0E0C0] rounded-xl text-sm bg-[#FFFBF0] focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-[#777] mb-1 block">وصف مختصر</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="مثال: احصل على منتج مجاني مع طلبك" className="w-full px-3 py-2 border border-[#F0E0C0] rounded-xl text-sm bg-[#FFFBF0] focus:outline-none" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4 accent-[#F07800]" />
                <label className="text-xs text-[#555]">مفعّل</label>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setModalOpen(false)} className="px-4 py-2 border border-[#F0E0C0] rounded-lg text-sm text-[#777] hover:bg-[#FFF8E8] transition">إلغاء</button>
                <button onClick={handleSave} disabled={!form.triggerAll && form.triggerProductIds.length === 0} className="px-6 py-2 bg-[#F07800] hover:bg-[#C85A00] text-white rounded-lg text-sm font-medium transition disabled:opacity-50">{editId ? "حفظ التعديلات" : "إضافة"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Admin Panel ─── */
function AdminPanel() {
  const {
    products,
    orders,
    categories,
    adminTab,
    setAdminTab,
    deleteProduct,
    updateOrderStatus,
    deleteOrder,
    setCurrentView,
  } = useShopStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    cat: "",
    price: "",
    disc: "",
    desc: "",
    tag1: "",
    tag2: "",
  });
  const [tempImg, setTempImg] = useState<string>("");
  const [tempImages, setTempImages] = useState<string[]>([]);  // additional product images
  const [tempVideo, setTempVideo] = useState<string>("");  // product video (1:1 square)
const [tempRelatedIds, setTempRelatedIds] = useState<number[]>([]);

  // Category modal state
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catEditId, setCatEditId] = useState<number | null>(null);
  const [catForm, setCatForm] = useState({ name: "", icon: "" });

  // Orders state
  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const newOrders = orders.filter((o) => o.status === "جديد").length;

  const openAddModal = () => {
    setEditId(null);
    setForm({ name: "", cat: "", price: "", disc: "", desc: "", tag1: "", tag2: "" });
    setTempImg("");
    setTempImages([]);
    setTempVideo("");
setTempRelatedIds([]);
    setModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditId(p.id);
    setForm({
      name: p.name,
      cat: p.cat,
      price: p.price.toString(),
      disc: (p.disc || 0).toString(),
      desc: p.desc || "",
      tag1: p.tags?.[0] || "",
      tag2: p.tags?.[1] || "",
    });
    setTempImg(p.img || "");
    setTempImages(p.images || []);
    setTempVideo(p.video || "");
setTempRelatedIds(Array.isArray(p.relatedIds) ? p.relatedIds as number[] : []);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const productData = {
      name: form.name.trim(),
      cat: form.cat.trim() || "عام",
      price: parseFloat(form.price) || 0,
      disc: parseFloat(form.disc) || 0,
      desc: form.desc.trim(),
      tags: [form.tag1.trim(), form.tag2.trim()].filter(Boolean),
      img: tempImg,
      images: tempImages,
      video: tempVideo,
relatedIds: tempRelatedIds,
      rating: 4.5,
      reviews: 0,
      sold: 0,
    };

    if (editId) {
      useShopStore.getState().updateProduct(editId, productData);
    } else {
      useShopStore.getState().addProduct({
        ...productData,
        id: Date.now(),
      });
    }
    setModalOpen(false);
  };

  const handleImgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => setTempImg(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleAdditionalImgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((f) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        if (result) {
          setTempImages((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(f);
    });
    // Reset the input so the same file can be selected again
    e.target.value = "";
  };

  const removeAdditionalImg = (index: number) => {
    setTempImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    // Validate file type
    if (!f.type.startsWith("video/")) {
      alert("يرجى اختيار ملف فيديو فقط");
      return;
    }
    // Validate file size (max 50MB)
    if (f.size > 50 * 1024 * 1024) {
      alert("حجم الفيديو يجب أن يكون أقل من 50 ميجابايت");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (result) {
        setTempVideo(result);
      }
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[#1A1A1A] flex items-center gap-2">
          <Settings size={20} />
          لوحة التحكم
        </h2>
        <button
          onClick={() => useShopStore.getState().navigateTo("catalog")}
          className="text-sm text-[#F07800] hover:underline"
        >
          → المتجر
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: "الأقسام", value: categories.length, icon: <Folder size={16} /> },
          { label: "المنتجات", value: products.length, icon: <Package size={16} /> },
          { label: "الطلبات", value: orders.length, icon: <ClipboardList size={16} /> },
          { label: "طلبات جديدة", value: newOrders, icon: <Clock size={16} /> },
          { label: "الإيرادات", value: formatPrice(totalRevenue), icon: <CreditCard size={16} /> },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-[#F0E0C0] p-3">
            <div className="flex items-center gap-1.5 text-[#999] text-xs mb-1">
              {s.icon} {s.label}
            </div>
            <div className="text-xl font-bold text-[#1A1A1A]">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setAdminTab("appearance")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-1.5 ${
            adminTab === "appearance"
              ? "bg-[#F07800] text-white"
              : "bg-white text-[#777] border border-[#F0E0C0]"
          }`}
        >
          <Eye size={14} /> المظهر
        </button>
        <button
          onClick={() => setAdminTab("categories")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-1.5 ${
            adminTab === "categories"
              ? "bg-[#F07800] text-white"
              : "bg-white text-[#777] border border-[#F0E0C0]"
          }`}
        >
          <Folder size={14} /> الأقسام
        </button>
        <button
          onClick={() => setAdminTab("products")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-1.5 ${
            adminTab === "products"
              ? "bg-[#F07800] text-white"
              : "bg-white text-[#777] border border-[#F0E0C0]"
          }`}
        >
          <Package size={14} /> المنتجات
        </button>
        <button
          onClick={() => setAdminTab("orders")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-1.5 ${
            adminTab === "orders"
              ? "bg-[#F07800] text-white"
              : "bg-white text-[#777] border border-[#F0E0C0]"
          }`}
        >
          <ClipboardList size={14} /> الطلبات
        </button>
        <button
          onClick={() => setAdminTab("texts")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-1.5 ${
            adminTab === "texts"
              ? "bg-[#F07800] text-white"
              : "bg-white text-[#777] border border-[#F0E0C0]"
          }`}
        >
          <Type size={14} /> النصوص
        </button>
        <button
          onClick={() => setAdminTab("coupons")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-1.5 ${
            adminTab === "coupons"
              ? "bg-[#F07800] text-white"
              : "bg-white text-[#777] border border-[#F0E0C0]"
          }`}
        >
          <Tag size={14} /> الكوبونات
        </button>
        <button
          onClick={() => setAdminTab("gifts")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-1.5 ${
            adminTab === "gifts"
              ? "bg-[#F07800] text-white"
              : "bg-white text-[#777] border border-[#F0E0C0]"
          }`}
        >
          <GiftIcon size={14} /> الهدايا
        </button>
      </div>

      {/* Texts Tab */}
      {adminTab === "texts" && (
        <div className="space-y-4">
          {/* Hero Texts */}
          <div className="bg-white rounded-xl border border-[#F0E0C0] overflow-hidden">
            <div className="bg-[#FFF8E8] p-4 border-b border-[#F0E0C0]">
              <h3 className="font-bold text-sm text-[#C85A00] flex items-center gap-2">
                <Star size={16} /> القسم الرئيسي (Hero)
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <TextSettingField label="شارة الضمان" field="heroBadgeText" placeholder="✦ منتجات أصلية مضمونة ✦" />
              <TextSettingField label="وصف سطر أول" field="heroDescLine1" placeholder="منتجات أصلية مضمونة — الدفع عند الاستلام فقط" />
              <TextSettingField label="وصف سطر ثاني" field="heroDescLine2" placeholder="اطلب واطمن على المنتج الأولاني وبعدين ادفع!" />
            </div>
          </div>

          {/* Trust Badges Texts */}
          <div className="bg-white rounded-xl border border-[#F0E0C0] overflow-hidden">
            <div className="bg-[#FFF8E8] p-4 border-b border-[#F0E0C0]">
              <h3 className="font-bold text-sm text-[#C85A00] flex items-center gap-2">
                <Shield size={16} /> شارات الثقة
              </h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <TextSettingField label="شارة المنتجات الأصلية" field="badgeOriginalText" placeholder="منتجات أصلية" />
              <TextSettingField label="شارة الدفع عند الاستلام" field="badgeCODText" placeholder="دفع عند الاستلام" />
              <TextSettingField label="شارة التوصيل السريع" field="badgeDeliveryText" placeholder="توصيل سريع مجاناً" />
              <TextSettingField label="شارة الاسترجاع" field="badgeReturnText" placeholder="استرجاع 7 أيام" />
            </div>
          </div>

          {/* Advantages Texts */}
          <div className="bg-white rounded-xl border border-[#F0E0C0] overflow-hidden">
            <div className="bg-[#FFF8E8] p-4 border-b border-[#F0E0C0]">
              <h3 className="font-bold text-sm text-[#C85A00] flex items-center gap-2">
                <Award size={16} /> قسم المميزات
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <TextSettingField label="عنوان الأصلية" field="advOriginalTitle" placeholder="منتجات أصلية" />
                <TextSettingField label="وصف الأصلية" field="advOriginalDesc" placeholder="مضمونة 100% من مصادر موثوقة" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextSettingField label="عنوان الدفع" field="advCODTitle" placeholder="دفع عند الاستلام" />
                <TextSettingField label="وصف الدفع" field="advCODDesc" placeholder="اطمن الأول وبعدين ادفع" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextSettingField label="عنوان التوصيل" field="advDeliveryTitle" placeholder="توصيل سريع مجاناً" />
                <TextSettingField label="وصف التوصيل" field="advDeliveryDesc" placeholder="للطلبات فوق 300 ج.م" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextSettingField label="عنوان الاسترجاع" field="advReturnTitle" placeholder="استرجاع 7 أيام" />
                <TextSettingField label="وصف الاسترجاع" field="advReturnDesc" placeholder="لو مش أصلي هنجيب فلوسك" />
              </div>
            </div>
          </div>

          {/* Navigation Texts */}
          <div className="bg-white rounded-xl border border-[#F0E0C0] overflow-hidden">
            <div className="bg-[#FFF8E8] p-4 border-b border-[#F0E0C0]">
              <h3 className="font-bold text-sm text-[#C85A00] flex items-center gap-2">
                <Menu size={16} /> القائمة والتنقل
              </h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <TextSettingField label="الرئيسية" field="navHomeText" placeholder="الرئيسية" />
              <TextSettingField label="المنتجات" field="navProductsText" placeholder="المنتجات" />
              <TextSettingField label="الأكثر مبيعاً" field="navBestSellingText" placeholder="الأكثر مبيعاً" />
              <TextSettingField label="سياسة الاسترجاع" field="navPolicyText" placeholder="سياسة الاسترجاع" />
              <TextSettingField label="كل المنتجات" field="navAllProductsText" placeholder="كل المنتجات" />
            </div>
          </div>

          {/* Search & Sort Texts */}
          <div className="bg-white rounded-xl border border-[#F0E0C0] overflow-hidden">
            <div className="bg-[#FFF8E8] p-4 border-b border-[#F0E0C0]">
              <h3 className="font-bold text-sm text-[#C85A00] flex items-center gap-2">
                <Search size={16} /> البحث والترتيب
              </h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <TextSettingField label="نص البحث" field="searchPlaceholder" placeholder="ابحث عن منتج..." />
              <TextSettingField label="الأحدث" field="sortNewest" placeholder="الأحدث" />
              <TextSettingField label="السعر من الأقل" field="sortPriceLow" placeholder="السعر: من الأقل" />
              <TextSettingField label="السعر من الأعلى" field="sortPriceHigh" placeholder="السعر: من الأعلى" />
              <TextSettingField label="الأكثر مبيعاً" field="sortBestSelling" placeholder="الأكثر مبيعاً" />
              <TextSettingField label="لا توجد منتجات" field="noProductsTitle" placeholder="لا توجد منتجات مطابقة" />
            </div>
          </div>

          {/* Cart Texts */}
          <div className="bg-white rounded-xl border border-[#F0E0C0] overflow-hidden">
            <div className="bg-[#FFF8E8] p-4 border-b border-[#F0E0C0]">
              <h3 className="font-bold text-sm text-[#C85A00] flex items-center gap-2">
                <ShoppingCart size={16} /> السلة
              </h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <TextSettingField label="عنوان السلة" field="cartTitle" placeholder="سلة التسوق" />
              <TextSettingField label="السلة فارغة" field="cartEmptyTitle" placeholder="السلة فارغة" />
              <TextSettingField label="وصف الفارغة" field="cartEmptyDesc" placeholder="أضف منتجات من الكتالوج" />
              <TextSettingField label="توصيل مجاني" field="cartFreeShippingMsg" placeholder="واو! عندك توصيل مجاني" />
              <TextSettingField label="عدد المنتجات" field="cartItemCount" placeholder="عدد المنتجات" />
              <TextSettingField label="الشحن" field="cartShipping" placeholder="الشحن" />
              <TextSettingField label="الإجمالي" field="cartTotal" placeholder="الإجمالي" />
              <TextSettingField label="مجاني" field="cartFreeText" placeholder="مجاني" />
              <TextSettingField label="يُحدد لاحقاً" field="cartShippingLater" placeholder="يُحدد لاحقاً" />
              <TextSettingField label="زر الإتمام" field="cartCheckoutBtn" placeholder="إتمام الطلب ←" />
            </div>
          </div>

          {/* Checkout Texts */}
          <div className="bg-white rounded-xl border border-[#F0E0C0] overflow-hidden">
            <div className="bg-[#FFF8E8] p-4 border-b border-[#F0E0C0]">
              <h3 className="font-bold text-sm text-[#C85A00] flex items-center gap-2">
                <ClipboardList size={16} /> الدفع والطلب
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <TextSettingField label="عنوان الطلب" field="checkoutTitle" placeholder="بيانات الطلب" />
                <TextSettingField label="ملخص الطلب" field="checkoutSummaryTitle" placeholder="ملخص الطلب" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextSettingField label="خطوة السلة" field="checkoutStepCart" placeholder="السلة" />
                <TextSettingField label="خطوة البيانات" field="checkoutStepInfo" placeholder="البيانات" />
                <TextSettingField label="خطوة التأكيد" field="checkoutStepConfirm" placeholder="التأكيد" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextSettingField label="عنوان الدفع" field="checkoutCODTitle" placeholder="الدفع عند الاستلام فقط" />
                <TextSettingField label="وصف الدفع" field="checkoutCODDesc" placeholder="هتستلم المنتج وتتأكد إنه أصلي وبعدين تدفع — مفيش أي مخاطرة!" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextSettingField label="الاسم الكامل" field="checkoutNameLabel" placeholder="الاسم الكامل" />
                <TextSettingField label="مثال الاسم" field="checkoutNamePlaceholder" placeholder="مثال: محمد أحمد" />
                <TextSettingField label="رقم التليفون" field="checkoutPhoneLabel" placeholder="رقم التليفون" />
                <TextSettingField label="المحافظة" field="checkoutGovLabel" placeholder="المحافظة" />
                <TextSettingField label="اختيار المحافظة" field="checkoutGovPlaceholder" placeholder="اختار المحافظة" />
                <TextSettingField label="العنوان" field="checkoutAddrLabel" placeholder="العنوان بالتفصيل" />
                <TextSettingField label="مثال العنوان" field="checkoutAddrPlaceholder" placeholder="الحي، الشارع، رقم العمارة..." />
                <TextSettingField label="الملاحظات" field="checkoutNotesLabel" placeholder="ملاحظات (اختياري)" />
                <TextSettingField label="مثال الملاحظات" field="checkoutNotesPlaceholder" placeholder="أي طلبات خاصة..." />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <TextSettingField label="رجوع للسلة" field="checkoutBackToCart" placeholder="رجوع للسلة" />
                <TextSettingField label="تأكيد الطلب" field="checkoutConfirmBtn" placeholder="تأكيد الطلب" />
                <TextSettingField label="متابعة التسوق" field="checkoutContinueShopping" placeholder="متابعة التسوق" />
              </div>
            </div>
          </div>

          {/* Validation Error Texts */}
          <div className="bg-white rounded-xl border border-[#F0E0C0] overflow-hidden">
            <div className="bg-[#FFF8E8] p-4 border-b border-[#F0E0C0]">
              <h3 className="font-bold text-sm text-[#C85A00] flex items-center gap-2">
                <AlertCircle size={16} /> رسائل الأخطاء
              </h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <TextSettingField label="الاسم مطلوب" field="errorNameRequired" placeholder="الاسم مطلوب" />
              <TextSettingField label="التليفون مطلوب" field="errorPhoneRequired" placeholder="رقم التليفون مطلوب" />
              <TextSettingField label="تليفون خطأ" field="errorPhoneInvalid" placeholder="رقم التليفون مش صحيح" />
              <TextSettingField label="المحافظة مطلوبة" field="errorGovRequired" placeholder="اختار المحافظة" />
              <TextSettingField label="العنوان مطلوب" field="errorAddrRequired" placeholder="العنوان مطلوب" />
            </div>
          </div>

          {/* Success Page Texts */}
          <div className="bg-white rounded-xl border border-[#F0E0C0] overflow-hidden">
            <div className="bg-[#FFF8E8] p-4 border-b border-[#F0E0C0]">
              <h3 className="font-bold text-sm text-[#C85A00] flex items-center gap-2">
                <CheckCircle size={16} /> صفحة النجاح
              </h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <TextSettingField label="عنوان النجاح" field="successTitle" placeholder="تم استلام طلبك!" />
              <TextSettingField label="شكراً" field="successMsg" placeholder="شكراً" />
              <TextSettingField label="رقم الطلب" field="successOrderNum" placeholder="رقم الطلب" />
              <TextSettingField label="طريقة الدفع" field="successPaymentMethod" placeholder="طريقة الدفع" />
              <TextSettingField label="الدفع عند الاستلام" field="successCODLabel" placeholder="الدفع عند الاستلام" />
              <TextSettingField label="التوصيل" field="successDeliveryLabel" placeholder="التوصيل" />
              <TextSettingField label="مدة التوصيل" field="successDeliveryTime" placeholder="خلال 4 أيام" />
              <TextSettingField label="رسالة التواصل" field="successContactMsg" placeholder="تقدر تتواصل معانا على صفحتنا على فيسبوك" />
              <TextSettingField label="متابعة التسوق" field="successContinueBtn" placeholder="متابعة التسوق" />
            </div>
          </div>

          {/* Policy Page Texts */}
          <div className="bg-white rounded-xl border border-[#F0E0C0] overflow-hidden">
            <div className="bg-[#FFF8E8] p-4 border-b border-[#F0E0C0]">
              <h3 className="font-bold text-sm text-[#C85A00] flex items-center gap-2">
                <RotateCcw size={16} /> سياسة الاسترجاع والشحن
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <TextSettingField label="عنوان الصفحة" field="policyPageTitle" placeholder="سياسة الاسترجاع والشحن" />
              <TextSettingField label="الرجوع للمتجر" field="policyBackToStore" placeholder="الرجوع للمتجر" />
              <TextSettingField label="عنوان الاسترجاع" field="policyReturnTitle" placeholder="سياسة الاسترجاع" />
              <TextSettingField label="محتوى الاسترجاع" field="policyReturnContent" placeholder="تقدر ترجع المنتج خلال 7 أيام..." multiline />
              <TextSettingField label="عنوان الشحن" field="policyShippingTitle" placeholder="الشحن والتوصيل" />
              <TextSettingField label="محتوى الشحن" field="policyShippingContent" placeholder="التوصيل خلال 4 أيام حسب المحافظة..." multiline />
              <TextSettingField label="عنوان طرق الدفع" field="policyPaymentTitle" placeholder="طرق الدفع" />
              <TextSettingField label="محتوى طرق الدفع" field="policyPaymentContent" placeholder="الدفع عند الاستلام فقط..." multiline />
              <TextSettingField label="عنوان ضمان الأصالة" field="policyAuthTitle" placeholder="ضمان الأصالة" />
              <TextSettingField label="محتوى ضمان الأصالة" field="policyAuthContent" placeholder="كل منتجاتنا أصلية 100%..." multiline />
              <TextSettingField label="عنوان التواصل" field="policyContactTitle" placeholder="التواصل والدعم" />
              <TextSettingField label="محتوى التواصل" field="policyContactContent" placeholder="لو عندك أي سؤال أو مشكلة..." multiline />
            </div>
          </div>

          {/* Product Detail Texts */}
          <div className="bg-white rounded-xl border border-[#F0E0C0] overflow-hidden">
            <div className="bg-[#FFF8E8] p-4 border-b border-[#F0E0C0]">
              <h3 className="font-bold text-sm text-[#C85A00] flex items-center gap-2">
                <Package size={16} /> صفحة المنتج
              </h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <TextSettingField label="عنوان لماذا تطلب" field="productWhyOrderTitle" placeholder="لماذا تطلب من صيدليتي؟" />
              <TextSettingField label="في السلة" field="productInCartText" placeholder="في السلة" />
              <TextSettingField label="شراء الآن" field="productBuyNowBtn" placeholder="شراء الآن" />
              <TextSettingField label="منتجات مشابهة" field="productRelatedTitle" placeholder="منتجات مشابهة" />
              <TextSettingField label="مدة التوصيل" field="productDeliveryTime" placeholder="خلال 4 أيام" />
              <TextSettingField label="شارة أصلية 100%" field="productOriginalBadge" placeholder="منتجات أصلية 100%" />
              <TextSettingField label="وصف الأصلية" field="productOriginalSub" placeholder="مضمونة من مصادر موثوقة" />
              <TextSettingField label="وصف الدفع" field="productCODSub" placeholder="اطمن الأول وبعدين ادفع" />
              <TextSettingField label="وصف التوصيل" field="productDeliverySub" placeholder="خلال 4 أيام" />
              <TextSettingField label="وصف الاسترجاع" field="productReturnSub" placeholder="لو مش أصلي هنجيب فلوسك" />
            </div>
          </div>

          {/* Invoice Texts */}
          <div className="bg-white rounded-xl border border-[#F0E0C0] overflow-hidden">
            <div className="bg-[#FFF8E8] p-4 border-b border-[#F0E0C0]">
              <h3 className="font-bold text-sm text-[#C85A00] flex items-center gap-2">
                <FileText size={16} /> الفاتورة
              </h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <TextSettingField label="فاتورة" field="invoiceTitle" placeholder="فاتورة" />
              <TextSettingField label="رقم الطلب" field="invoiceOrderNum" placeholder="رقم الطلب" />
              <TextSettingField label="التاريخ" field="invoiceDate" placeholder="التاريخ" />
              <TextSettingField label="العميل" field="invoiceCustomer" placeholder="العميل" />
              <TextSettingField label="التليفون" field="invoicePhone" placeholder="التليفون" />
              <TextSettingField label="العنوان" field="invoiceAddress" placeholder="العنوان" />
              <TextSettingField label="المنتج" field="invoiceProduct" placeholder="المنتج" />
              <TextSettingField label="الكمية" field="invoiceQty" placeholder="الكمية" />
              <TextSettingField label="السعر" field="invoicePrice" placeholder="السعر" />
              <TextSettingField label="الإجمالي" field="invoiceTotal" placeholder="الإجمالي" />
              <TextSettingField label="الشحن" field="invoiceShipping" placeholder="الشحن" />
              <TextSettingField label="الدفع عند الاستلام" field="invoiceCOD" placeholder="الدفع عند الاستلام" />
            </div>
          </div>

          {/* Coupon & Gift Texts */}
          <div className="bg-white rounded-xl border border-[#F0E0C0] overflow-hidden">
            <div className="bg-[#FFF8E8] p-4 border-b border-[#F0E0C0]">
              <h3 className="font-bold text-sm text-[#C85A00] flex items-center gap-2">
                <Tag size={16} /> الكوبونات والهدايا
              </h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <TextSettingField label="نص إدخال الكوبون" field="couponPlaceholder" placeholder="أدخل كود الخصم" />
              <TextSettingField label="زر التطبيق" field="couponApplyBtn" placeholder="تطبيق" />
              <TextSettingField label="كوبون غير صالح" field="couponInvalidMsg" placeholder="كود الخصم غير صالح" />
              <TextSettingField label="كوبون منتهي" field="couponExpiredMsg" placeholder="كود الخصم منتهي الصلاحية" />
              <TextSettingField label="الحد الأدنى" field="couponMinOrderMsg" placeholder="الحد الأدنى للطلب" />
              <TextSettingField label="تم الاستخدام" field="couponMaxUsesMsg" placeholder="تم استخدام هذا الكود الحد الأقصى" />
              <TextSettingField label="تم التطبيق" field="couponAppliedMsg" placeholder="تم تطبيق الخصم!" />
              <TextSettingField label="الخصم" field="couponDiscountLabel" placeholder="الخصم" />
              <TextSettingField label="هدية مجانية" field="giftLabel" placeholder="هدية مجانية!" />
              <TextSettingField label="أضف للهدية" field="giftMinOrderMsg" placeholder="أضف منتجات بـ" />
            </div>
          </div>
        </div>
      )}

      {/* Coupons Tab */}
      {adminTab === "coupons" && (
        <CouponAdminTab />
      )}

      {/* Gifts Tab */}
      {adminTab === "gifts" && (
        <GiftAdminTab />
      )}

      {/* Appearance Tab */}
      {adminTab === "appearance" && (
        <div className="space-y-4">
          {/* Header Settings */}
          <div className="bg-white rounded-xl border border-[#F0E0C0] overflow-hidden">
            <div className="bg-[#FFF8E8] p-4 border-b border-[#F0E0C0]">
              <h3 className="font-bold text-sm text-[#C85A00] flex items-center gap-2">
                <Store size={16} /> إعدادات الهيدر (الرأس)
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs text-[#777] mb-1.5 block">شعار المتجر (لوجو)</label>
                <div className="flex items-center gap-3">
                  {/* Preview */}
                  <div className="w-14 h-14 rounded-xl border-2 border-dashed border-[#F0E0C0] flex items-center justify-center overflow-hidden bg-[#FFFBF0] flex-shrink-0">
                    {useShopStore.getState().siteSettings.storeLogoUrl ? (
                      <img
                        src={useShopStore.getState().siteSettings.storeLogoUrl}
                        alt="logo"
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <span className="text-xl font-bold text-[#F07800]">
                        {useShopStore.getState().siteSettings.storeLogoLetter || "ص"}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="cursor-pointer px-4 py-2 bg-[#F07800] hover:bg-[#C85A00] text-white rounded-xl text-sm font-medium transition flex items-center justify-center gap-2">
                      <Upload size={14} />
                      رفع صورة اللوجو
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          // Resize and compress before storing
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const img = new Image();
                            img.onload = () => {
                              const canvas = document.createElement("canvas");
                              const maxSize = 200;
                              let w = img.width;
                              let h = img.height;
                              if (w > h) {
                                if (w > maxSize) { h = h * maxSize / w; w = maxSize; }
                              } else {
                                if (h > maxSize) { w = w * maxSize / h; h = maxSize; }
                              }
                              canvas.width = w;
                              canvas.height = h;
                              const ctx = canvas.getContext("2d");
                              ctx?.drawImage(img, 0, 0, w, h);
                              const dataUrl = canvas.toDataURL("image/png", 0.8);
                              useShopStore.getState().updateSiteSetting("storeLogoUrl", dataUrl);
                            };
                            img.src = ev.target?.result as string;
                          };
                          reader.readAsDataURL(file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {useShopStore.getState().siteSettings.storeLogoUrl && (
                      <button
                        onClick={() => useShopStore.getState().updateSiteSetting("storeLogoUrl", "")}
                        className="text-xs text-[#e24b4a] hover:underline transition"
                      >
                        حذف الصورة والرجوع للحرف
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#777] mb-1.5 block">اسم المتجر</label>
                  <input
                    type="text"
                    value={useShopStore.getState().siteSettings.storeName}
                    onChange={(e) => useShopStore.getState().updateSiteSetting("storeName", e.target.value)}
                    className="w-full px-3 py-2.5 border border-[#F0E0C0] rounded-xl text-sm bg-[#FFFBF0] focus:outline-none focus:ring-2 focus:ring-[#F07800]/30"
                    placeholder="اسم المتجر"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#777] mb-1.5 block">حرف الشعار (بديل لو مفيش صورة)</label>
                  <input
                    type="text"
                    value={useShopStore.getState().siteSettings.storeLogoLetter}
                    onChange={(e) => useShopStore.getState().updateSiteSetting("storeLogoLetter", e.target.value)}
                    className="w-full px-3 py-2.5 border border-[#F0E0C0] rounded-xl text-sm bg-[#FFFBF0] focus:outline-none focus:ring-2 focus:ring-[#F07800]/30 text-center text-lg font-bold"
                    placeholder="ص"
                    maxLength={2}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-[#777] mb-1.5 block">نص شريط الإعلانات (افصل بين الرسائل بـ |)</label>
                <textarea
                  value={useShopStore.getState().siteSettings.announcementText}
                  onChange={(e) => useShopStore.getState().updateSiteSetting("announcementText", e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#F0E0C0] rounded-xl text-sm bg-[#FFFBF0] focus:outline-none focus:ring-2 focus:ring-[#F07800]/30 resize-none"
                  rows={2}
                  placeholder="نص الإعلان 1 | نص الإعلان 2 | نص الإعلان 3"
                />
              </div>
            </div>
          </div>

          {/* Layout & Size Settings */}
          <div className="bg-white rounded-xl border border-[#F0E0C0] overflow-hidden">
            <div className="bg-[#FFF8E8] p-4 border-b border-[#F0E0C0]">
              <h3 className="font-bold text-sm text-[#C85A00] flex items-center gap-2">
                <Eye size={16} /> إعدادات العرض والأحجام
              </h3>
            </div>
            <div className="p-4 space-y-4">
              {/* Layout Width */}
              <div>
                <label className="text-xs text-[#777] mb-2 block">عرض الموقع (الهيدر + المنتجات + الفوتر)</label>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    { value: "narrow", label: "ضيق", desc: "768px" },
                    { value: "medium", label: "متوسط", desc: "1024px" },
                    { value: "wide", label: "واسع", desc: "1152px" },
                    { value: "full", label: "كامل", desc: "100%" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => useShopStore.getState().updateSiteSetting("layoutWidth", opt.value)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-medium border-2 transition ${
                        useShopStore.getState().siteSettings.layoutWidth === opt.value
                          ? "border-[#F07800] bg-[#FFF3C4] text-[#C85A00]"
                          : "border-[#F0E0C0] bg-white text-[#777] hover:border-[#F07800]/50"
                      }`}
                    >
                      <span className="block font-bold text-sm">{opt.label}</span>
                      <span className="block text-[10px] mt-0.5 opacity-70">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Product Image Height */}
              <div>
                <label className="text-xs text-[#777] mb-2 block">حجم صورة المنتج في البطاقة</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "small", label: "صغير", desc: "160×200" },
                    { value: "medium", label: "متوسط", desc: "200×240" },
                    { value: "large", label: "كبير", desc: "260×300" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => useShopStore.getState().updateSiteSetting("productImageHeight", opt.value)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-medium border-2 transition ${
                        useShopStore.getState().siteSettings.productImageHeight === opt.value
                          ? "border-[#F07800] bg-[#FFF3C4] text-[#C85A00]"
                          : "border-[#F0E0C0] bg-white text-[#777] hover:border-[#F07800]/50"
                      }`}
                    >
                      <span className="block font-bold text-sm">{opt.label}</span>
                      <span className="block text-[10px] mt-0.5 opacity-70">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Header Size */}
              <div>
                <label className="text-xs text-[#777] mb-2 block">حجم الهيدر (الغلاف)</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "compact", label: "صغير", desc: "ضيق ومدمج" },
                    { value: "normal", label: "متوسط", desc: "افتراضي" },
                    { value: "large", label: "كبير", desc: "واسع وعريض" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => useShopStore.getState().updateSiteSetting("headerSize", opt.value)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-medium border-2 transition ${
                        useShopStore.getState().siteSettings.headerSize === opt.value
                          ? "border-[#F07800] bg-[#FFF3C4] text-[#C85A00]"
                          : "border-[#F0E0C0] bg-white text-[#777] hover:border-[#F07800]/50"
                      }`}
                    >
                      <span className="block font-bold text-sm">{opt.label}</span>
                      <span className="block text-[10px] mt-0.5 opacity-70">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Footer Size - removed, footer now shows only copyright */}
            </div>
          </div>

          {/* Mobile Display Settings */}
          <div className="bg-white rounded-xl border border-[#F0E0C0] overflow-hidden">
            <div className="bg-[#FFF8E8] p-4 border-b border-[#F0E0C0]">
              <h3 className="font-bold text-sm text-[#C85A00] flex items-center gap-2">
                <Smartphone size={16} /> إعدادات عرض الموبايل
              </h3>
            </div>
            <div className="p-4 space-y-4">
              {/* Mobile Card Style */}
              <div>
                <label className="text-xs text-[#777] mb-2 block font-bold flex items-center gap-1"><Eye size={12} /> نمط عرض بطاقة المنتج على الموبايل</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "horizontal" as const, label: "أفقي", desc: "صورة جنب المعلومات", icon: "▐██" },
                    { value: "vertical" as const, label: "عمودي", desc: "صورة فوق المعلومات", icon: "▀▀▀" },
                    { value: "grid" as const, label: "شبكة", desc: "عمودين متوازيين", icon: "█ █" },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => useShopStore.getState().updateSiteSetting("mobileCardStyle", opt.value)}
                      className={`px-2 py-3 rounded-xl text-xs font-medium border-2 transition ${
                        useShopStore.getState().siteSettings.mobileCardStyle === opt.value
                          ? "border-[#F07800] bg-[#FFF3C4] text-[#C85A00]"
                          : "border-[#F0E0C0] bg-white text-[#777] hover:border-[#F07800]/50"
                      }`}
                    >
                      <span className="block text-base mb-1 font-mono text-center">{opt.icon}</span>
                      <span className="block font-bold text-[11px]">{opt.label}</span>
                      <span className="block text-[9px] mt-0.5 opacity-70">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Mobile Card Size */}
              <div>
                <label className="text-xs text-[#777] mb-2 block font-bold flex items-center gap-1"><Maximize size={12} /> حجم بطاقة المنتج على الموبايل</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "compact" as const, label: "مدمج", desc: "صغير ومضغوط" },
                    { value: "normal" as const, label: "متوسط", desc: "افتراضي" },
                    { value: "large" as const, label: "كبير", desc: "واسع وعريض" },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => useShopStore.getState().updateSiteSetting("mobileCardSize", opt.value)}
                      className={`px-2 py-2.5 rounded-xl text-xs font-medium border-2 transition ${
                        useShopStore.getState().siteSettings.mobileCardSize === opt.value
                          ? "border-[#F07800] bg-[#FFF3C4] text-[#C85A00]"
                          : "border-[#F0E0C0] bg-white text-[#777] hover:border-[#F07800]/50"
                      }`}
                    >
                      <span className="block font-bold text-sm">{opt.label}</span>
                      <span className="block text-[9px] mt-0.5 opacity-70">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Mobile Category Style */}
              <div>
                <label className="text-xs text-[#777] mb-2 block font-bold flex items-center gap-1"><Folder size={12} /> نمط عرض أقسام الفئات على الموبايل</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "scroll" as const, label: "تمرير أفقي", desc: "سكرول يمين شمال" },
                    { value: "wrap" as const, label: "التفاف", desc: "ينزلوا تحت بعض" },
                    { value: "grid" as const, label: "شبكة", desc: "3 أعمدة منسقة" },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => useShopStore.getState().updateSiteSetting("mobileCatStyle", opt.value)}
                      className={`px-2 py-2.5 rounded-xl text-xs font-medium border-2 transition ${
                        useShopStore.getState().siteSettings.mobileCatStyle === opt.value
                          ? "border-[#F07800] bg-[#FFF3C4] text-[#C85A00]"
                          : "border-[#F0E0C0] bg-white text-[#777] hover:border-[#F07800]/50"
                      }`}
                    >
                      <span className="block font-bold text-sm">{opt.label}</span>
                      <span className="block text-[9px] mt-0.5 opacity-70">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Mobile Viewport Mode */}
              <div>
                <label className="text-xs text-[#777] mb-2 block">عرض محتوى الموبايل</label>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    { value: "full" as const, label: "كامل", desc: "من الحافة" },
                    { value: "padded" as const, label: "هوامش", desc: "max-w-lg" },
                    { value: "card" as const, label: "بطاقة", desc: "max-w-sm" },
                    { value: "compact" as const, label: "مضغوط", desc: "max-w-xs" },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => useShopStore.getState().updateSiteSetting("mobileViewport", opt.value)}
                      className={`px-2 py-2.5 rounded-xl text-xs font-medium border-2 transition ${
                        useShopStore.getState().siteSettings.mobileViewport === opt.value
                          ? "border-[#F07800] bg-[#FFF3C4] text-[#C85A00]"
                          : "border-[#F0E0C0] bg-white text-[#777] hover:border-[#F07800]/50"
                      }`}
                    >
                      <span className="block font-bold text-[11px]">{opt.label}</span>
                      <span className="block text-[9px] mt-0.5 opacity-70">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Mobile Zoom */}
              <div>
                <label className="text-xs text-[#777] mb-2 block flex items-center gap-1"><ZoomIn size={12} /> مستوى التكبير/التصغير على الموبايل</label>
                <div className="grid grid-cols-5 gap-2">
                  {([
                    { value: "75" as const, label: "75%", desc: "تصغير" },
                    { value: "85" as const, label: "85%", desc: "أصغر" },
                    { value: "100" as const, label: "100%", desc: "افتراضي" },
                    { value: "110" as const, label: "110%", desc: "أكبر" },
                    { value: "120" as const, label: "120%", desc: "تكبير" },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => useShopStore.getState().updateSiteSetting("mobileZoom", opt.value)}
                      className={`px-2 py-2.5 rounded-xl text-xs font-medium border-2 transition ${
                        useShopStore.getState().siteSettings.mobileZoom === opt.value
                          ? "border-[#F07800] bg-[#FFF3C4] text-[#C85A00]"
                          : "border-[#F0E0C0] bg-white text-[#777] hover:border-[#F07800]/50"
                      }`}
                    >
                      <span className="block font-bold text-sm">{opt.label}</span>
                      <span className="block text-[9px] mt-0.5 opacity-70">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Mobile Padding */}
              <div>
                <label className="text-xs text-[#777] mb-2 block flex items-center gap-1"><Maximize size={12} /> الهامش الداخلي على الموبايل (px)</label>
                <div className="grid grid-cols-5 gap-2">
                  {([
                    { value: "0" as const, label: "0", desc: "بدون" },
                    { value: "4" as const, label: "4", desc: "خفيف" },
                    { value: "8" as const, label: "8", desc: "متوسط" },
                    { value: "12" as const, label: "12", desc: "واسع" },
                    { value: "16" as const, label: "16", desc: "أوسع" },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => useShopStore.getState().updateSiteSetting("mobilePadding", opt.value)}
                      className={`px-2 py-2.5 rounded-xl text-xs font-medium border-2 transition ${
                        useShopStore.getState().siteSettings.mobilePadding === opt.value
                          ? "border-[#F07800] bg-[#FFF3C4] text-[#C85A00]"
                          : "border-[#F0E0C0] bg-white text-[#777] hover:border-[#F07800]/50"
                      }`}
                    >
                      <span className="block font-bold text-sm">{opt.label}px</span>
                      <span className="block text-[9px] mt-0.5 opacity-70">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Mobile Preview */}
              <div className="border border-dashed border-[#F0E0C0] rounded-xl p-3">
                <div className="text-[10px] text-[#999] mb-2 text-center">معاينة الموبايل — نمط البطاقة: {useShopStore.getState().siteSettings.mobileCardStyle === "horizontal" ? "أفقي" : useShopStore.getState().siteSettings.mobileCardStyle === "vertical" ? "عمودي" : "شبكة"}</div>
                <div className="flex justify-center">
                  <div className="w-[220px] h-[160px] border-2 border-[#ddd] rounded-2xl bg-white overflow-hidden relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-[#ddd] rounded-b-full" />
                    <div
                      className="w-full h-full overflow-hidden"
                      style={{
                        padding: `${useShopStore.getState().siteSettings.mobilePadding}px`,
                        zoom: useShopStore.getState().siteSettings.mobileZoom === "100" ? 1 : Number(useShopStore.getState().siteSettings.mobileZoom) / 100,
                      }}
                    >
                      <div className="w-full mx-auto">
                        {/* Category row preview */}
                        <div className="flex gap-1 mb-1.5">
                          <div className="bg-[#F07800] h-2 rounded-sm w-8" />
                          <div className="bg-[#FFF3C4] h-2 rounded-sm border border-[#F0E0C0] w-6" />
                          <div className="bg-[#FFF3C4] h-2 rounded-sm border border-[#F0E0C0] w-7" />
                          <div className="bg-[#FFF3C4] h-2 rounded-sm border border-[#F0E0C0] w-5" />
                        </div>
                        {/* Card preview based on style */}
                        {useShopStore.getState().siteSettings.mobileCardStyle === "grid" ? (
                          <div className="grid grid-cols-2 gap-1">
                            <div className="bg-[#FFF8E8] rounded-sm border border-[#F0E0C0] overflow-hidden">
                              <div className="bg-[#F07800] h-6" />
                              <div className="p-1">
                                <div className="bg-[#F0E0C0] h-1.5 rounded-sm mb-0.5 w-3/4" />
                                <div className="bg-[#C85A00] h-1.5 rounded-sm w-1/2" />
                              </div>
                            </div>
                            <div className="bg-[#FFF8E8] rounded-sm border border-[#F0E0C0] overflow-hidden">
                              <div className="bg-[#F5C400] h-6" />
                              <div className="p-1">
                                <div className="bg-[#F0E0C0] h-1.5 rounded-sm mb-0.5 w-3/4" />
                                <div className="bg-[#C85A00] h-1.5 rounded-sm w-1/2" />
                              </div>
                            </div>
                          </div>
                        ) : useShopStore.getState().siteSettings.mobileCardStyle === "horizontal" ? (
                          <div className="bg-[#FFF8E8] rounded-sm border border-[#F0E0C0] flex overflow-hidden mb-1">
                            <div className="bg-[#F07800] w-8 flex-shrink-0" />
                            <div className="p-1.5 flex-1">
                              <div className="bg-[#F0E0C0] h-1.5 rounded-sm mb-0.5 w-3/4" />
                              <div className="bg-[#eee] h-1 rounded-sm mb-0.5 w-full" />
                              <div className="bg-[#C85A00] h-1.5 rounded-sm w-1/2" />
                            </div>
                          </div>
                        ) : (
                          <div className="bg-[#FFF8E8] rounded-sm border border-[#F0E0C0] overflow-hidden mb-1">
                            <div className="bg-[#F07800] h-8" />
                            <div className="p-1.5">
                              <div className="bg-[#F0E0C0] h-1.5 rounded-sm mb-0.5 w-3/4" />
                              <div className="bg-[#eee] h-1 rounded-sm mb-0.5 w-full" />
                              <div className="bg-[#C85A00] h-1.5 rounded-sm w-1/2" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Settings */}
          <div className="bg-white rounded-xl border border-[#F0E0C0] overflow-hidden">
            <div className="bg-[#FFF8E8] p-4 border-b border-[#F0E0C0]">
              <h3 className="font-bold text-sm text-[#C85A00] flex items-center gap-2">
                <BadgePercent size={16} /> إعدادات القسم الرئيسي (Hero)
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#777] mb-1.5 block">العنوان الرئيسي</label>
                  <input
                    type="text"
                    value={useShopStore.getState().siteSettings.heroTitle}
                    onChange={(e) => useShopStore.getState().updateSiteSetting("heroTitle", e.target.value)}
                    className="w-full px-3 py-2.5 border border-[#F0E0C0] rounded-xl text-sm bg-[#FFFBF0] focus:outline-none focus:ring-2 focus:ring-[#F07800]/30"
                    placeholder="منتجات العناية بالبشرة"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#777] mb-1.5 block">العنوان الفرعي</label>
                  <input
                    type="text"
                    value={useShopStore.getState().siteSettings.heroSubtitle}
                    onChange={(e) => useShopStore.getState().updateSiteSetting("heroSubtitle", e.target.value)}
                    className="w-full px-3 py-2.5 border border-[#F0E0C0] rounded-xl text-sm bg-[#FFFBF0] focus:outline-none focus:ring-2 focus:ring-[#F07800]/30"
                    placeholder="الأصلية 100%"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-[#777] mb-1.5 block">نص زر التسوق</label>
                <input
                  type="text"
                  value={useShopStore.getState().siteSettings.heroButtonText}
                  onChange={(e) => useShopStore.getState().updateSiteSetting("heroButtonText", e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#F0E0C0] rounded-xl text-sm bg-[#FFFBF0] focus:outline-none focus:ring-2 focus:ring-[#F07800]/30"
                  placeholder="تسوق الآن ←"
                />
              </div>
            </div>
          </div>

          {/* Footer Settings */}
          <div className="bg-white rounded-xl border border-[#F0E0C0] overflow-hidden">
            <div className="bg-[#FFF8E8] p-4 border-b border-[#F0E0C0]">
              <h3 className="font-bold text-sm text-[#C85A00] flex items-center gap-2">
                <Info size={16} /> إعدادات التذييل
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs text-[#777] mb-1.5 block">نص حقوق النشر</label>
                <input
                  type="text"
                  value={useShopStore.getState().siteSettings.copyrightText}
                  onChange={(e) => useShopStore.getState().updateSiteSetting("copyrightText", e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#F0E0C0] rounded-xl text-sm bg-[#FFFBF0] focus:outline-none focus:ring-2 focus:ring-[#F07800]/30"
                  placeholder="صيدليتي — جميع الحقوق محفوظة"
                />
              </div>
            </div>
          </div>

          {/* Contact Settings */}
          <div className="bg-white rounded-xl border border-[#F0E0C0] overflow-hidden">
            <div className="bg-[#FFF8E8] p-4 border-b border-[#F0E0C0]">
              <h3 className="font-bold text-sm text-[#C85A00] flex items-center gap-2">
                <Phone size={16} /> إعدادات التواصل
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#777] mb-1.5 block">رابط صفحة فيسبوك</label>
                  <input
                    type="text"
                    value={useShopStore.getState().siteSettings.facebookUrl}
                    onChange={(e) => useShopStore.getState().updateSiteSetting("facebookUrl", e.target.value)}
                    className="w-full px-3 py-2.5 border border-[#F0E0C0] rounded-xl text-sm bg-[#FFFBF0] focus:outline-none focus:ring-2 focus:ring-[#F07800]/30"
                    placeholder="https://facebook.com/saydaliti"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#777] mb-1.5 block">نص رابط فيسبوك</label>
                  <input
                    type="text"
                    value={useShopStore.getState().siteSettings.facebookLabel}
                    onChange={(e) => useShopStore.getState().updateSiteSetting("facebookLabel", e.target.value)}
                    className="w-full px-3 py-2.5 border border-[#F0E0C0] rounded-xl text-sm bg-[#FFFBF0] focus:outline-none focus:ring-2 focus:ring-[#F07800]/30"
                    placeholder="صفحة صيدليتي على فيسبوك"
                  />
                </div>
              </div>
              {/* Messenger URL - Featured */}
              <div className="bg-gradient-to-l from-blue-50 to-[#EFF6FF] rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0084FF] flex items-center justify-center">
                    <MessageCircle size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#0084FF]">رابط ماسنجر</p>
                    <p className="text-[10px] text-[#888]">الزر العائم هيوجه العميل لرسائل صفحتك</p>
                  </div>
                </div>
                <input
                  type="text"
                  value={useShopStore.getState().siteSettings.messengerUrl || ""}
                  onChange={(e) => useShopStore.getState().updateSiteSetting("messengerUrl", e.target.value)}
                  className="w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0084FF]/30"
                  placeholder="https://m.me/اسم_صفحتك"
                  dir="ltr"
                />
                <p className="text-[10px] text-[#888] mt-1.5">مثال: https://m.me/saydaliti — استبدل saydaliti باسم صفحتك</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#777] mb-1.5 block">رابط الموقع</label>
                  <input
                    type="text"
                    value={useShopStore.getState().siteSettings.websiteUrl}
                    onChange={(e) => useShopStore.getState().updateSiteSetting("websiteUrl", e.target.value)}
                    className="w-full px-3 py-2.5 border border-[#F0E0C0] rounded-xl text-sm bg-[#FFFBF0] focus:outline-none focus:ring-2 focus:ring-[#F07800]/30"
                    placeholder="https://saydaliti.com"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#777] mb-1.5 block">نص رابط الموقع</label>
                  <input
                    type="text"
                    value={useShopStore.getState().siteSettings.websiteLabel}
                    onChange={(e) => useShopStore.getState().updateSiteSetting("websiteLabel", e.target.value)}
                    className="w-full px-3 py-2.5 border border-[#F0E0C0] rounded-xl text-sm bg-[#FFFBF0] focus:outline-none focus:ring-2 focus:ring-[#F07800]/30"
                    placeholder="زيارة موقعنا"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Reset Settings */}
          <div className="bg-white rounded-xl border border-[#F0E0C0] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]">إعادة ضبط الإعدادات</p>
                <p className="text-xs text-[#999]">إرجاع كل الإعدادات للقيم الافتراضية</p>
              </div>
              <button
                onClick={() => {
                  if (confirm("هترجع كل الإعدادات للقيم الافتراضية؟")) {
                    useShopStore.getState().setSiteSettings(DEFAULT_SITE_SETTINGS);
                  }
                }}
                className="px-4 py-2 border border-[#e24b4a] text-[#e24b4a] rounded-xl text-sm font-medium hover:bg-[#e24b4a] hover:text-white transition"
              >
                <RotateCcw size={14} className="inline ml-1" />
                إعادة ضبط
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products Tab */}
      {adminTab === "products" && (
        <div>
          <div className="flex justify-end mb-3">
            <button
              onClick={openAddModal}
              className="bg-[#F07800] hover:bg-[#C85A00] text-white text-sm font-medium px-4 py-2 rounded-xl transition flex items-center gap-1"
            >
              <Plus size={14} /> منتج جديد
            </button>
          </div>
          <div className="bg-white rounded-xl border border-[#F0E0C0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#F0E0C0] bg-[#FFF8E8]">
                    <th className="p-3 text-right text-[#777] font-medium text-xs">
                      المنتج
                    </th>
                    <th className="p-3 text-right text-[#777] font-medium text-xs">
                      التصنيف
                    </th>
                    <th className="p-3 text-right text-[#777] font-medium text-xs">
                      السعر
                    </th>
                    <th className="p-3 text-right text-[#777] font-medium text-xs">
                      الخصم
                    </th>
                    <th className="p-3 text-right text-[#777] font-medium text-xs">
                      إجراءات
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b border-[#F5EFE0] last:border-0">
                      <td className="p-3 font-medium text-[#1A1A1A]">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-[#FFF8E8] flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                            {p.img ? (
                              <img src={p.img} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Package size={14} className="text-[#F0E0C0]" />
                            )}
                            {(p.images && p.images.length > 0) && (
                              <div className="absolute -bottom-0.5 -left-0.5 w-4 h-4 bg-[#2d8a4e] rounded-full text-white text-[7px] font-bold flex items-center justify-center shadow-sm">
                                {p.images.length + 1}
                              </div>
                            )}
                          </div>
                          {p.name}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-xs bg-[#FFF3C4] text-[#C85A00] px-2 py-0.5 rounded-full">
                          {p.cat}
                        </span>
                      </td>
                      <td className="p-3 text-[#C85A00] font-medium">
                        {formatPrice(calcFinalPrice(p.price, p.disc))} ج.م
                      </td>
                      <td className="p-3">
                        {p.disc ? (
                          <span className="text-[#C85A00] font-medium">{p.disc}%</span>
                        ) : (
                          <span className="text-[#ccc]">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 hover:bg-[#FFF8E8] rounded-lg transition text-[#777] hover:text-[#F07800]"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("هتحذف المنتج ده؟"))
                                deleteProduct(p.id);
                            }}
                            className="p-1.5 hover:bg-[#FFF3C4] rounded-lg transition text-[#777] hover:text-[#e24b4a]"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {adminTab === "categories" && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-[#777]">
              {categories.length} قسم — التحكم في أقسام المنتجات المعروضة في المتجر
            </p>
            <button
              onClick={() => {
                setCatEditId(null);
                setCatForm({ name: "", icon: "" });
                setCatModalOpen(true);
              }}
              className="bg-[#F07800] hover:bg-[#C85A00] text-white text-sm font-medium px-4 py-2 rounded-xl transition flex items-center gap-1"
            >
              <FolderPlus size={14} /> قسم جديد
            </button>
          </div>

          <div className="bg-white rounded-xl border border-[#F0E0C0] overflow-hidden">
            {categories.length === 0 ? (
              <div className="p-8 text-center text-[#999]">
                <Folder size={32} className="mx-auto opacity-30 mb-2" />
                لا توجد أقسام بعد — أضف أقسام لتنظيم المنتجات
              </div>
            ) : (
              <div className="divide-y divide-[#F5EFE0]">
                {[...categories]
                  .sort((a, b) => a.order - b.order)
                  .map((cat) => {
                    const productCount = products.filter(
                      (p) => p.cat === cat.name
                    ).length;
                    return (
                      <div
                        key={cat.id}
                        className="flex items-center gap-3 p-4 hover:bg-[#FFFBF0] transition"
                      >
                        {/* Drag handle */}
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() =>
                              useShopStore.getState().moveCategoryUp(cat.id)
                            }
                            className="p-0.5 text-[#ccc] hover:text-[#F07800] transition disabled:opacity-30"
                            disabled={cat.order <= 1}
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            onClick={() =>
                              useShopStore.getState().moveCategoryDown(cat.id)
                            }
                            className="p-0.5 text-[#ccc] hover:text-[#F07800] transition"
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>

                        {/* Icon */}
                        <span className="text-2xl w-10 h-10 flex items-center justify-center bg-[#FFF8E8] rounded-xl">
                          {cat.icon || "📁"}
                        </span>

                        {/* Name & Count */}
                        <div className="flex-1">
                          <h4 className="font-bold text-sm text-[#1A1A1A]">
                            {cat.name}
                          </h4>
                          <p className="text-xs text-[#999]">
                            {productCount} منتج
                          </p>
                        </div>

                        {/* Order badge */}
                        <span className="text-[10px] bg-[#FFF3C4] text-[#C85A00] px-2 py-0.5 rounded-full font-medium">
                          ترتيب {cat.order}
                        </span>

                        {/* Actions */}
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setCatEditId(cat.id);
                              setCatForm({ name: cat.name, icon: cat.icon });
                              setCatModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-[#FFF8E8] rounded-lg transition text-[#777] hover:text-[#F07800]"
                            title="تعديل"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => {
                              const count = products.filter(
                                (p) => p.cat === cat.name
                              ).length;
                              if (
                                count > 0 &&
                                !confirm(
                                  `فيه ${count} منتج في القسم ده، هيتنقلوا لـ "عام". تمسح القسم؟`
                                )
                              )
                                return;
                              if (count === 0 && !confirm("هتحذف القسم ده؟"))
                                return;
                              useShopStore.getState().deleteCategory(cat.id);
                            }}
                            className="p-1.5 hover:bg-[#FFF3C4] rounded-lg transition text-[#777] hover:text-[#e24b4a]"
                            title="حذف"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Quick tip */}
          <div className="mt-4 bg-[#FFF8E8] rounded-xl p-4 flex items-start gap-3">
            <Info size={18} className="text-[#F07800] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#C85A00] mb-1">
                نصيحة سريعة
              </p>
              <p className="text-xs text-[#777] leading-relaxed">
                الأقسام بتظهر في المتجر بنفس الترتيب اللي هنا. استخدم الأسهم ↑↓
                لتغيير الترتيب. لما تحذف قسم، المنتجات اللي فيه هتتنقل تلقائي
                لقسم "عام".
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {adminTab === "orders" && (
        <div className="space-y-4">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { key: "all", label: "الكل", count: orders.length },
              { key: "جديد", label: "جديد", count: orders.filter((o) => o.status === "جديد").length },
              { key: "جاري التوصيل", label: "جاري التوصيل", count: orders.filter((o) => o.status === "جاري التوصيل").length },
              { key: "تم التسليم", label: "تم التسليم", count: orders.filter((o) => o.status === "تم التسليم").length },
            ].map((tab) => {
              const isActive = orderFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setOrderFilter(tab.key)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition cursor-pointer ${
                    isActive
                      ? tab.key === "جديد"
                        ? "bg-[#FFF3C4] text-[#C85A00] ring-1 ring-[#C85A00]"
                        : tab.key === "جاري التوصيل"
                        ? "bg-[#DBEAFE] text-[#1D4ED8] ring-1 ring-[#1D4ED8]"
                        : tab.key === "تم التسليم"
                        ? "bg-[#EAF3DE] text-[#2d8a4e] ring-1 ring-[#2d8a4e]"
                        : "bg-[#1A1A1A] text-white ring-1 ring-[#1A1A1A]"
                      : "bg-gray-100 text-[#777] hover:bg-gray-200"
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              );
            })}
          </div>

          {/* Orders List */}
          {orders.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#F0E0C0] p-8 text-center text-[#999]">
              <ClipboardList size={32} className="mx-auto opacity-30 mb-2" />
              لا توجد طلبات بعد
            </div>
          ) : (
            <div className="space-y-3">
              {orders
                .filter((o) => orderFilter === "all" || o.status === orderFilter)
                .map((o) => {
                  const isExpanded = expandedOrder === o.id;
                  return (
                    <div key={o.id} className="bg-white rounded-xl border border-[#F0E0C0] overflow-hidden">
                      {/* Order Header Row */}
                      <div
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-[#FFFCF5] transition"
                        onClick={() => setExpandedOrder(isExpanded ? null : o.id)}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="text-xs font-bold text-[#C85A00] whitespace-nowrap">{o.id}</div>
                          <div className="text-sm font-medium text-[#1A1A1A] truncate">{o.name}</div>
                          <div className="text-xs text-[#777] whitespace-nowrap">{o.phone}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm font-bold text-[#C85A00]">{formatPrice(o.total)} ج.م</span>
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                              o.status === "جديد"
                                ? "bg-[#FFF3C4] text-[#C85A00]"
                                : o.status === "جاري التوصيل"
                                ? "bg-[#DBEAFE] text-[#1D4ED8]"
                                : "bg-[#EAF3DE] text-[#2d8a4e]"
                            }`}
                          >
                            {o.status}
                          </span>
                          <ChevronDown
                            size={16}
                            className={`text-[#999] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </div>
                      </div>

                      {/* Expanded Order Details */}
                      {isExpanded && (
                        <div className="border-t border-[#F0E0C0] p-4 space-y-4 bg-[#FFFCF5]">
                          {/* Customer Info */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="text-[10px] text-[#999] mb-0.5">اسم العميل</div>
                              <div className="text-sm font-bold text-[#1A1A1A]">{o.name}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-[#999] mb-0.5">رقم التليفون</div>
                              <div className="text-sm font-medium text-[#1A1A1A]">{o.phone}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-[#999] mb-0.5">المحافظة</div>
                              <div className="text-sm font-medium text-[#1A1A1A]">{o.gov}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-[#999] mb-0.5">العنوان</div>
                              <div className="text-sm font-medium text-[#1A1A1A]">{o.addr}</div>
                            </div>
                          </div>
                          {o.notes && (
                            <div className="bg-[#FFF3C4] rounded-lg p-2.5">
                              <span className="text-[10px] font-bold text-[#C85A00]">ملاحظات: </span>
                              <span className="text-xs text-[#555]">{o.notes}</span>
                            </div>
                          )}

                          {/* Order Items */}
                          <div>
                            <div className="text-[10px] text-[#999] mb-2">المنتجات</div>
                            <div className="space-y-1.5">
                              {o.items.map((item, idx) => {
                                const p = products.find((x) => x.id === item.id);
                                const isGift = item.isGift === true;
                                const itemKey = isGift ? `gift-${item.giftId || item.id}-${idx}` : `item-${item.id}-${idx}`;
                                return (
                                  <div key={itemKey} className={`flex items-center justify-between text-xs rounded-lg px-3 py-2 border ${isGift ? "bg-[#EAF3DE]/50 border-[#2d8a4e]/20" : "bg-white border-[#F5F5F5]"}`}>
                                    <span className="font-medium flex items-center gap-1">
                                      {isGift && <GiftIcon size={12} className="text-[#2d8a4e]" />}
                                      {p?.name || "منتج محذوف"}
                                      {isGift && <span className="text-[9px] bg-[#EAF3DE] text-[#2d8a4e] px-1.5 py-0.5 rounded-full font-bold">هدية</span>}
                                    </span>
                                    <span className="text-[#777]">×{item.qty}</span>
                                    <span className={`font-bold ${isGift ? "text-[#2d8a4e]" : "text-[#C85A00]"}`}>
                                      {isGift ? "مجاني" : p ? `${formatPrice(calcFinalPrice(p.price, p.disc) * item.qty)} ج.م` : "0 ج.م"}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Order Date & Total */}
                          <div className="flex items-center justify-between text-xs text-[#777]">
                            <span>تاريخ الطلب: {o.date}</span>
                            <span className="font-bold text-sm text-[#C85A00]">الإجمالي: {formatPrice(o.total)} ج.م</span>
                          </div>

                          {/* Status Control & Actions */}
                          <div className="flex items-center justify-between pt-2 border-t border-[#F0E0C0]">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#777]">تغيير الحالة:</span>
                              <div className="flex gap-1.5">
                                {(["جديد", "جاري التوصيل", "تم التسليم"] as const).map((s) => (
                                  <button
                                    key={s}
                                    onClick={() => updateOrderStatus(o.id, s)}
                                    className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition cursor-pointer ${
                                      o.status === s
                                        ? s === "جديد"
                                          ? "bg-[#FFF3C4] text-[#C85A00] ring-1 ring-[#C85A00]"
                                          : s === "جاري التوصيل"
                                          ? "bg-[#DBEAFE] text-[#1D4ED8] ring-1 ring-[#1D4ED8]"
                                          : "bg-[#EAF3DE] text-[#2d8a4e] ring-1 ring-[#2d8a4e]"
                                        : "bg-gray-100 text-[#999] hover:bg-gray-200"
                                    }`}
                                  >
                                    {s}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  useShopStore.getState().setInvoiceOrderId(o.id);
                                  useShopStore.getState().setInvoiceOpen(true);
                                }}
                                className="text-xs px-3 py-1.5 rounded-lg font-medium bg-[#1A1A1A] text-white hover:bg-[#333] transition flex items-center gap-1 cursor-pointer"
                              >
                                <FileText size={12} />
                                فاتورة
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm("هل أنت متأكد من حذف هذا الطلب؟")) {
                                    deleteOrder(o.id);
                                    setExpandedOrder(null);
                                  }
                                }}
                                className="text-xs px-3 py-1.5 rounded-lg font-medium bg-red-50 text-red-500 hover:bg-red-100 transition flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 size={12} />
                                حذف
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              {orders.filter((o) => orderFilter === "all" || o.status === orderFilter).length === 0 && (
                <div className="bg-white rounded-xl border border-[#F0E0C0] p-6 text-center text-[#999] text-sm">
                  لا توجد طلبات بهذه الحالة
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Product Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-right">
              {editId ? "تعديل المنتج" : "إضافة منتج جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Image Upload */}
            <div>
              <label className="text-xs text-[#777] mb-1 block">صورة المنتج الرئيسية</label>
              {tempImg ? (
                <div className="flex items-center gap-2">
                  <img
                    src={tempImg}
                    alt="preview"
                    className="w-16 h-16 rounded-xl object-cover border border-[#F0E0C0]"
                  />
                  <button
                    onClick={() => setTempImg("")}
                    className="text-xs text-[#e24b4a] hover:underline"
                  >
                    إزالة
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#F0E0C0] rounded-xl p-4 cursor-pointer hover:bg-[#FFF8E8] transition">
                  <Upload size={20} className="text-[#F07800] mb-1" />
                  <span className="text-xs text-[#777]">ارفع صورة من جهازك</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImgUpload}
                  />
                </label>
              )}
            </div>

            {/* Additional Images Upload */}
            <div>
              <label className="text-xs text-[#777] mb-1 block">صور إضافية (على الطبيعة، تفاصيل المنتج...)</label>
              {tempImages.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {tempImages.map((img, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={img}
                        alt={`صورة ${i + 1}`}
                        className="w-14 h-14 rounded-lg object-cover border border-[#F0E0C0]"
                      />
                      <button
                        onClick={() => removeAdditionalImg(i)}
                        className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-[#e24b4a] text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className="flex items-center gap-2 border-2 border-dashed border-[#F0E0C0] rounded-xl p-3 cursor-pointer hover:bg-[#FFF8E8] transition">
                <ImagePlus size={18} className="text-[#2d8a4e]" />
                <span className="text-xs text-[#777]">أضف صور إضافية (يمكنك اختيار عدة صور)</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleAdditionalImgUpload}
                />
              </label>
            </div>

            {/* Video Upload (1:1 Square) */}
            <div>
              <label className="text-xs text-[#777] mb-1 block">فيديو المنتج (مقاس مربع 1:1)</label>
              {tempVideo ? (
                <div className="space-y-2">
                  <div className="relative w-full max-w-[200px] aspect-square rounded-xl overflow-hidden border border-[#F0E0C0] bg-black">
                    <video
                      src={tempVideo}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center">
                        <Play size={18} className="text-[#F07800] mr-[-2px]" />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setTempVideo("")}
                    className="text-xs text-[#e24b4a] hover:underline flex items-center gap-1"
                  >
                    <Trash2 size={12} />
                    إزالة الفيديو
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 border-2 border-dashed border-[#E0C0F0] rounded-xl p-3 cursor-pointer hover:bg-[#F8F0FF] transition bg-[#FDF8FF]">
                  <Video size={18} className="text-[#9333EA]" />
                  <div className="flex-1">
                    <span className="text-xs text-[#777] block">ارفع فيديو مربع (1:1) للمنتج</span>
                    <span className="text-[10px] text-[#aaa] block mt-0.5">MP4, MOV — أقصى حجم 50 ميجابايت</span>
                  </div>
                  <input
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm,video/*"
                    className="hidden"
                    onChange={handleVideoUpload}
                  />
                </label>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#777] mb-1 block">اسم المنتج</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#F0E0C0] rounded-lg text-sm bg-[#FFFBF0]"
                  placeholder="اسم المنتج"
                />
              </div>
              <div>
                <label className="text-xs text-[#777] mb-1 block">التصنيف</label>
                <select
                  value={form.cat}
                  onChange={(e) => setForm({ ...form, cat: e.target.value })}
                  className="w-full px-3 py-2 border border-[#F0E0C0] rounded-lg text-sm bg-[#FFFBF0] cursor-pointer"
                >
                  <option value="">اختار التصنيف</option>
                  {useShopStore.getState().categories
                    .sort((a, b) => a.order - b.order)
                    .map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  <option value="عام">عام</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#777] mb-1 block">السعر (ج.م)</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full px-3 py-2 border border-[#F0E0C0] rounded-lg text-sm bg-[#FFFBF0]"
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <label className="text-xs text-[#777] mb-1 block">خصم %</label>
                <input
                  type="number"
                  value={form.disc}
                  onChange={(e) => setForm({ ...form, disc: e.target.value })}
                  className="w-full px-3 py-2 border border-[#F0E0C0] rounded-lg text-sm bg-[#FFFBF0]"
                  placeholder="0"
                  min="0"
                  max="100"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#777] mb-1 block">هاشتاق 1</label>
                <input
                  type="text"
                  value={form.tag1}
                  onChange={(e) => setForm({ ...form, tag1: e.target.value })}
                  className="w-full px-3 py-2 border border-[#F0E0C0] rounded-lg text-sm bg-[#FFFBF0]"
                  placeholder="#منتج"
                />
              </div>
              <div>
                <label className="text-xs text-[#777] mb-1 block">هاشتاق 2</label>
                <input
                  type="text"
                  value={form.tag2}
                  onChange={(e) => setForm({ ...form, tag2: e.target.value })}
                  className="w-full px-3 py-2 border border-[#F0E0C0] rounded-lg text-sm bg-[#FFFBF0]"
                  placeholder="#تصنيف"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-[#777] mb-1 block">الوصف</label>
              <textarea
                value={form.desc}
                onChange={(e) => setForm({ ...form, desc: e.target.value })}
                className="w-full px-3 py-2 border border-[#F0E0C0] rounded-lg text-sm bg-[#FFFBF0] resize-none"
                rows={2}
                placeholder="وصف مختصر..."
              />
<div>
  <label className="text-xs text-[#777] mb-1 block">العروض الإضافية المقترحة</label>
  <div className="max-h-40 overflow-y-auto border border-[#F0E0C0] rounded-xl p-2 bg-[#FFFBF0] space-y-1">
    {products.filter((p) => p.id !== editId).map((p) => (
      <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#FFF8E8] cursor-pointer">
        <input
          type="checkbox"
          checked={tempRelatedIds.includes(p.id)}
          onChange={() =>
            setTempRelatedIds((prev) =>
              prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id]
            )
          }
          className="w-3.5 h-3.5 accent-[#F07800]"
        />
        <span className="text-xs text-[#555] truncate flex-1">{p.name}</span>
        <span className="text-[10px] text-[#999]">{calcFinalPrice(p.price, p.disc)} ج.م</span>
      </label>
    ))}
  </div>
</div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-[#F0E0C0] rounded-lg text-sm text-[#777] hover:bg-[#FFF8E8] transition"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-[#F07800] hover:bg-[#C85A00] text-white rounded-lg text-sm font-medium transition"
              >
                حفظ
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Category Modal */}
      <Dialog open={catModalOpen} onOpenChange={setCatModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-right">
              {catEditId ? "تعديل القسم" : "إضافة قسم جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[#777] mb-1.5 block">اسم القسم</label>
              <input
                type="text"
                value={catForm.name}
                onChange={(e) =>
                  setCatForm({ ...catForm, name: e.target.value })
                }
                className="w-full px-3 py-2.5 border border-[#F0E0C0] rounded-xl text-sm bg-[#FFFBF0] focus:outline-none focus:ring-2 focus:ring-[#F07800]/30"
                placeholder="مثال: عناية بالبشرة"
              />
            </div>
            <div>
              <label className="text-xs text-[#777] mb-1.5 block">
                أيقونة القسم (إيموجي)
              </label>
              <div className="flex gap-2 items-center">
                <span className="text-3xl w-12 h-12 flex items-center justify-center bg-[#FFF8E8] rounded-xl border border-[#F0E0C0]">
                  {catForm.icon || "📁"}
                </span>
                <input
                  type="text"
                  value={catForm.icon}
                  onChange={(e) =>
                    setCatForm({ ...catForm, icon: e.target.value })
                  }
                  className="flex-1 px-3 py-2.5 border border-[#F0E0C0] rounded-xl text-sm bg-[#FFFBF0] focus:outline-none focus:ring-2 focus:ring-[#F07800]/30"
                  placeholder="اختر إيموجي"
                  maxLength={4}
                />
              </div>
              {/* Quick emoji picker */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  "✨",
                  "☀️",
                  "💧",
                  "🧴",
                  "🌟",
                  "💊",
                  "🧴",
                  "🌿",
                  "🧖",
                  "💆",
                  "🩹",
                  "🫧",
                  "🌸",
                  "🥥",
                  "🍯",
                  "🧪",
                  "🫀",
                  "💪",
                  "👁️",
                  "💋",
                ].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setCatForm({ ...catForm, icon: emoji })}
                    className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition hover:bg-[#FFF3C4] ${
                      catForm.icon === emoji
                        ? "bg-[#F07800]/10 ring-2 ring-[#F07800]"
                        : ""
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setCatModalOpen(false)}
                className="px-4 py-2 border border-[#F0E0C0] rounded-lg text-sm text-[#777] hover:bg-[#FFF8E8] transition"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  if (!catForm.name.trim()) return;
                  if (catEditId) {
                    // Update category name in products too
                    const oldCat = useShopStore
                      .getState()
                      .categories.find((c) => c.id === catEditId);
                    if (oldCat && oldCat.name !== catForm.name.trim()) {
                      const updatedProducts = useShopStore
                        .getState()
                        .products.map((p) =>
                          p.cat === oldCat.name
                            ? { ...p, cat: catForm.name.trim() }
                            : p
                        );
                      useShopStore.getState().setProducts(updatedProducts);
                    }
                    useShopStore.getState().updateCategory(catEditId, {
                      name: catForm.name.trim(),
                      icon: catForm.icon || "📁",
                    });
                  } else {
                    const maxOrder = useShopStore
                      .getState()
                      .categories.reduce(
                        (max, c) => Math.max(max, c.order),
                        0
                      );
                    useShopStore.getState().addCategory({
                      id: Date.now(),
                      name: catForm.name.trim(),
                      icon: catForm.icon || "📁",
                      order: maxOrder + 1,
                    });
                  }
                  setCatModalOpen(false);
                }}
                className="px-6 py-2 bg-[#F07800] hover:bg-[#C85A00] text-white rounded-lg text-sm font-medium transition"
              >
                حفظ
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Product Detail Page ─── */
function ProductDetailPage() {
  const {
    products,
    selectedProductId,
    addToCart,
    changeQty,
    getCartQty,
    setCurrentView,
    setSelectedProductId,
    siteSettings,
    categories,
  } = useShopStore();

  const product = products.find((p) => p.id === selectedProductId);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [selectedProductId]);

  if (!product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="animate-fade-in">
          <Package size={64} className="mx-auto text-[#F0E0C0] mb-4" />
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">المنتج غير موجود</h2>
          <p className="text-[#777] text-sm mb-6">عذراً، لم نتمكن من العثور على هذا المنتج</p>
          <button
            onClick={() => useShopStore.getState().navigateTo("catalog")}
            className="bg-[#F07800] hover:bg-[#C85A00] text-white font-bold px-8 py-3 rounded-xl transition"
          >
            ← العودة للمتجر
          </button>
        </div>
      </div>
    );
  }

  const qty = getCartQty(product.id);
  const finalPrice = calcFinalPrice(product.price, product.disc);
  const savings = product.price - finalPrice;
  const isBestSeller = product.sold > 300;
  const catObj = categories.find((c) => c.name === product.cat);
  const relatedIds = Array.isArray(product.relatedIds) ? product.relatedIds as number[] : [];
const relatedProducts = relatedIds.length > 0
  ? products.filter((p) => relatedIds.includes(p.id))
  : products.filter((p) => p.cat === product.cat && p.id !== product.id).slice(0, 4);

  // Build all product media: main image first, then additional images, then video at end
  const allImages = [
    ...(product.img ? [product.img] : []),
    ...(product.images || []),
  ];
  const hasVideo = !!product.video;
  const videoUrl = product.video || "";
  // Total media count includes video if present
  const totalMediaCount = allImages.length + (hasVideo ? 1 : 0);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Helper: pause video when navigating away from video slide
  const pauseVideo = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setIsPlayingVideo(false);
  }, []);

  // Reset selected image when product changes
  useEffect(() => {
    setSelectedImageIdx(0);
    setIsPlayingVideo(false);
  }, [selectedProductId]);

  // Touch swipe handling for image gallery
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null || totalMediaCount <= 1) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // Swipe left → next media
        const nextIdx = (selectedImageIdx + 1) % totalMediaCount;
        setSelectedImageIdx(nextIdx);
        if (nextIdx < allImages.length) pauseVideo();
      } else {
        // Swipe right → previous media
        const prevIdx = (selectedImageIdx - 1 + totalMediaCount) % totalMediaCount;
        setSelectedImageIdx(prevIdx);
        if (prevIdx < allImages.length) pauseVideo();
      }
    }
    setTouchStart(null);
  };

  const handleBuyNow = () => {
    if (qty === 0) {
      addToCart(product.id);
      showCartFlash(product.name);
    }
    useShopStore.getState().navigateTo("checkout");
  };

  const handleRelatedClick = (id: number) => {
    useShopStore.getState().navigateTo("productDetail", id);
  };

  return (
    <div
      className="max-w-3xl mx-auto px-4 py-6 page-transition"
    >
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[#999] mb-5 flex-wrap">
        <button
          onClick={() => useShopStore.getState().navigateTo("catalog")}
          className="hover:text-[#F07800] transition"
        >
          الرئيسية
        </button>
        <ChevronLeft size={14} />
        <button
          onClick={() => {
            useShopStore.getState().navigateTo("catalog");
            useShopStore.getState().setSelectedCategory(product.cat);
          }}
          className="hover:text-[#F07800] transition"
        >
          {catObj ? `${catObj.icon} ${catObj.name}` : product.cat}
        </button>
        <ChevronLeft size={14} />
        <span className="text-[#C85A00] font-medium truncate max-w-[200px]">
          {product.name}
        </span>
      </nav>

      {/* Back Button */}
      <button
        onClick={() => useShopStore.getState().navigateTo("catalog")}
        className="flex items-center gap-1.5 text-[#777] hover:text-[#F07800] text-sm mb-5 transition"
      >
        <ArrowRight size={18} />
        العودة للكتالوج
      </button>

      {/* Product Image Gallery */}
      <div className="mb-6 animate-scale-in" style={{ animationDelay: '0.1s' }}>
        {/* Main Image/Video Display */}
        <div
          className={`relative rounded-3xl overflow-hidden min-h-[300px] md:min-h-[400px] img-shimmer ${
            totalMediaCount > 0
              ? "bg-gradient-to-br from-[#F07800] via-[#F5C400] to-[#FFED80]"
              : "bg-gradient-to-br from-[#FFF3C4] to-[#FFE8A0]"
          }`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Check if current slide is the video slide */}
          {selectedImageIdx >= allImages.length && hasVideo ? (
            /* Video Slide */
            <div className="relative w-full min-h-[300px] md:min-h-[400px] bg-black flex items-center justify-center aspect-square">
              <video
                key={videoUrl}
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-cover min-h-[300px] md:min-h-[400px]"
                controls={isPlayingVideo}
                autoPlay={isPlayingVideo}
                playsInline
                loop
                preload="metadata"
                onClick={() => {
                  if (!isPlayingVideo) setIsPlayingVideo(true);
                }}
              />
              {!isPlayingVideo && (
                <button
                  onClick={() => setIsPlayingVideo(true)}
                  className="absolute inset-0 flex items-center justify-center z-10"
                >
                  <div className="w-20 h-20 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
                    <Play size={32} className="text-[#F07800] mr-[-3px]" fill="#F07800" />
                  </div>
                </button>
              )}
              {/* Video badge */}
              <div className="absolute top-4 right-4 bg-[#9333EA]/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 z-20">
                <Video size={14} />
                فيديو
              </div>
            </div>
          ) : allImages.length > 0 ? (
            /* Image Slide */
            <img
              src={allImages[selectedImageIdx] || product.img}
              alt={`${product.name} - صورة ${selectedImageIdx + 1}`}
              className="w-full h-full object-cover min-h-[300px] md:min-h-[400px] transition-all duration-300"
            />
          ) : (
            /* No media */
            <div className="w-full min-h-[300px] md:min-h-[400px] flex flex-col items-center justify-center text-white/60 gap-3">
              <Package size={64} strokeWidth={1} />
              <span className="text-sm">صورة المنتج</span>
            </div>
          )}

          {/* Discount Badge */}
          {product.disc > 0 && (
            <div className="absolute top-4 left-4 w-14 h-14 rounded-full bg-[#F07800] text-white text-sm font-bold flex items-center justify-center shadow-lg z-10">
              {product.disc}%
            </div>
          )}

          {/* Best Seller Badge */}
          {isBestSeller && (
            <div className={`absolute top-4 ${totalMediaCount > 1 ? 'right-4 top-14' : 'right-4'} bg-[#EAF3DE] text-[#2d8a4e] px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md z-10`}>
              <BadgePercent size={14} />
              الأكثر مبيعاً
            </div>
          )}

          {/* Navigation Arrows */}
          {totalMediaCount > 1 && (
            <>
              {/* Previous Arrow */}
              <button
                onClick={() => {
                  const prevIdx = (selectedImageIdx - 1 + totalMediaCount) % totalMediaCount;
                  setSelectedImageIdx(prevIdx);
                  if (prevIdx < allImages.length) pauseVideo();
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition z-10"
              >
                <ChevronLeft size={20} className="text-[#C85A00]" />
              </button>
              {/* Next Arrow */}
              <button
                onClick={() => {
                  const nextIdx = (selectedImageIdx + 1) % totalMediaCount;
                  setSelectedImageIdx(nextIdx);
                  if (nextIdx < allImages.length) pauseVideo();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition z-10"
              >
                <ChevronRight size={20} className="text-[#C85A00]" />
              </button>
              {/* Media Counter */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full z-10">
                {selectedImageIdx + 1} / {totalMediaCount}
              </div>
            </>
          )}

          {/* Camera/Video badge for media count */}
          {totalMediaCount > 1 && (
            <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 z-10">
              {selectedImageIdx >= allImages.length && hasVideo ? (
                <>
                  <Video size={12} />
                  فيديو
                </>
              ) : (
                <>
                  <Camera size={12} />
                  {allImages.length} صورة{hasVideo ? " + فيديو" : ""}
                </>
              )}
            </div>
          )}
        </div>

        {/* Thumbnail Strip (images + video thumbnail) */}
        {totalMediaCount > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto hide-scrollbar pb-1">
            {allImages.map((img, i) => (
              <button
                key={`img-${i}`}
                onClick={() => {
                  setSelectedImageIdx(i);
                  setIsPlayingVideo(false);
                }}
                className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                  i === selectedImageIdx
                    ? "border-[#F07800] shadow-md shadow-[#F07800]/20 scale-105"
                    : "border-[#F0E0C0] opacity-70 hover:opacity-100 hover:border-[#F07800]/50"
                }`}
              >
                <img
                  src={img}
                  alt={`صورة ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
            {/* Video Thumbnail */}
            {hasVideo && (
              <button
                key="video-thumb"
                onClick={() => {
                  setSelectedImageIdx(allImages.length);
                  setIsPlayingVideo(false);
                }}
                className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border-2 transition-all duration-200 relative bg-gradient-to-br from-[#9333EA] to-[#6B21A8] flex items-center justify-center ${
                  selectedImageIdx === allImages.length
                    ? "border-[#9333EA] shadow-md shadow-[#9333EA]/20 scale-105"
                    : "border-[#E0C0F0] opacity-70 hover:opacity-100 hover:border-[#9333EA]/50"
                }`}
              >
                {/* Try to show video poster, fallback to play icon */}
                <video
                  src={videoUrl}
                  className="absolute inset-0 w-full h-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Play size={16} className="text-white" fill="white" />
                </div>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Product Info Card */}
      <div
        className="bg-white rounded-3xl border border-[#F0E0C0] p-5 md:p-7 mb-5 animate-slide-up"
        style={{ animationDelay: '0.2s' }}
      >
        {/* Category Badge */}
        {catObj && (
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-xs bg-[#FFF3C4] text-[#C85A00] px-3 py-1 rounded-full font-medium flex items-center gap-1">
              {catObj.icon} {catObj.name}
            </span>
          </div>
        )}

        {/* Tags */}
        {product.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {product.tags.map((t, i) => (
              <span
                key={i}
                className="text-[10px] bg-[#FFF3C4] text-[#C85A00] px-2.5 py-0.5 rounded-full font-medium"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Product Name */}
        <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] leading-tight mb-3">
          {product.name}
        </h1>

        {/* Rating & Sold */}
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={16}
                className={
                  s <= Math.round(product.rating)
                    ? "fill-amber-400 text-amber-400"
                    : "text-gray-300"
                }
              />
            ))}
            <span className="text-sm font-bold text-[#C85A00] mr-1">
              {product.rating}
            </span>
            <span className="text-xs text-[#999]">({product.reviews} تقييم)</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-[#777]">
            <Clock size={14} />
            <span>بيع {formatPrice(product.sold)}+ قطعة</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-[#555] text-sm md:text-base leading-relaxed mb-5">
          {product.desc}
        </p>

        {/* Price Section */}
        <div className="bg-[#FFF8E8] rounded-2xl p-4 md:p-5 mb-5">
          <div className="flex items-center gap-3 flex-wrap">
            {product.disc > 0 && (
              <span className="text-base text-[#bbb] line-through">
                {formatPrice(product.price)} ج.م
              </span>
            )}
            <span className="text-2xl md:text-3xl font-bold text-[#C85A00]">
              {formatPrice(finalPrice)} ج.م
            </span>
            {savings > 0 && (
              <span className="text-xs bg-[#F07800] text-white px-3 py-1 rounded-full font-bold">
                وفر {formatPrice(savings)} ج.م
              </span>
            )}
          </div>
        </div>

        {/* Add to Cart / Qty Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          {qty === 0 ? (
            <button
              onClick={() => { addToCart(product.id); showCartFlash(product.name); }}
              className="flex-1 bg-[#F07800] hover:bg-[#C85A00] text-white font-bold py-3.5 px-6 rounded-xl text-base transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
            >
              <ShoppingCart size={18} />
              أضف للسلة
            </button>
          ) : (
            <div className="flex-1 flex items-center gap-4 bg-[#FFF8E8] rounded-xl p-3">
              <button
                onClick={() => changeQty(product.id, -1)}
                className="w-10 h-10 rounded-xl border border-[#F07800] text-[#F07800] hover:bg-[#F07800] hover:text-white flex items-center justify-center transition text-lg font-bold"
              >
                −
              </button>
              <span className="font-bold text-[#C85A00] text-xl min-w-[30px] text-center">
                {qty}
              </span>
              <button
                onClick={() => { addToCart(product.id); showCartFlash(product.name); }}
                className="w-10 h-10 rounded-xl border border-[#F07800] text-[#F07800] hover:bg-[#F07800] hover:text-white flex items-center justify-center transition text-lg font-bold"
              >
                +
              </button>
              <span className="text-[#2d8a4e] text-sm font-medium flex items-center gap-1 mr-1">
                <CheckCircle size={16} />
                {siteSettings.productInCartText || "في السلة"}
              </span>
            </div>
          )}
          <button
            onClick={handleBuyNow}
            className="flex-1 bg-[#C85A00] hover:bg-[#A04800] text-white font-bold py-3.5 px-6 rounded-xl text-base transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
          >
            {siteSettings.productBuyNowBtn || "شراء الآن"}
          </button>
        </div>
      </div>

      {/* Trust Badges */}
      <div
        className="bg-[#FFFBF0] rounded-2xl border border-[#F0E0C0] p-4 md:p-5 mb-6 animate-slide-up"
        style={{ animationDelay: '0.3s' }}
      >
        <h3 className="text-sm font-bold text-[#C85A00] mb-3 flex items-center gap-2">
          <Shield size={16} />
          {siteSettings.productWhyOrderTitle || "لماذا تطلب من صيدليتي؟"}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: <CheckCircle size={20} className="text-[#2d8a4e]" />, text: siteSettings.productOriginalBadge || "منتجات أصلية 100%", sub: siteSettings.productOriginalSub || "مضمونة من مصادر موثوقة" },
            { icon: <CreditCard size={20} className="text-[#2d8a4e]" />, text: siteSettings.badgeCODText || "الدفع عند الاستلام", sub: siteSettings.productCODSub || "اطمن الأول وبعدين ادفع" },
            { icon: <Truck size={20} className="text-[#2d8a4e]" />, text: siteSettings.badgeDeliveryText || "توصيل سريع", sub: siteSettings.productDeliverySub || "خلال 4 أيام" },
            { icon: <RotateCcw size={20} className="text-[#2d8a4e]" />, text: siteSettings.badgeReturnText || "استرجاع 7 أيام", sub: siteSettings.productReturnSub || "لو مش أصلي هنجيب فلوسك" },
          ].map((b, i) => (
            <div key={i} className="bg-white rounded-xl p-3 flex items-start gap-2.5">
              <div className="flex-shrink-0 mt-0.5">{b.icon}</div>
              <div>
                <p className="text-xs font-bold text-[#1A1A1A]">{b.text}</p>
                <p className="text-[10px] text-[#999] leading-relaxed">{b.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div
          className="animate-slide-up"
          style={{ animationDelay: '0.4s' }}
        >
          <h3 className="text-lg font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
            <Heart size={18} className="text-[#F07800]" />
            {siteSettings.productRelatedTitle || "منتجات مشابهة"}
          </h3>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-3">
            {relatedProducts.map((rp) => {
              const rpFinalPrice = calcFinalPrice(rp.price, rp.disc);
              return (
                <button
                  key={rp.id}
                  onClick={() => handleRelatedClick(rp.id)}
                  className="flex-shrink-0 w-[180px] bg-white rounded-2xl border border-[#F0E0C0] overflow-hidden shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all text-right"
                >
                  <div
                    className={`relative w-full h-[120px] overflow-hidden ${
                      rp.img
                        ? "bg-gradient-to-br from-[#F07800] to-[#F5C400]"
                        : "bg-gradient-to-br from-[#FFF3C4] to-[#FFE8A0]"
                    }`}
                  >
                    {rp.img ? (
                      <img
                        src={rp.img}
                        alt={rp.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/60">
                        <Package size={28} strokeWidth={1} />
                      </div>
                    )}
                    {rp.disc > 0 && (
                      <div className="absolute top-2 left-2 w-9 h-9 rounded-full bg-[#F07800] text-white text-[10px] font-bold flex items-center justify-center">
                        {rp.disc}%
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h4 className="text-xs font-bold text-[#1A1A1A] leading-snug line-clamp-2 mb-1.5">
                      {rp.name}
                    </h4>
                    <div className="flex items-center gap-1.5">
                      {rp.disc > 0 && (
                        <span className="text-[10px] text-[#bbb] line-through">
                          {formatPrice(rp.price)}
                        </span>
                      )}
                      <span className="text-sm font-bold text-[#C85A00]">
                        {formatPrice(rpFinalPrice)} ج.م
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Invoice Dialog ─── */
function InvoiceDialog() {
  const { invoiceOpen, setInvoiceOpen, invoiceOrderId, orders, products, siteSettings } = useShopStore();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const order = orders.find((o) => o.id === invoiceOrderId);

  // Convert Arabic-Indic digits to English digits
  const toEnNum = (str: string | number): string => {
    return String(str).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
      .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
      .replace(/٫/g, ".");
  };

  // Format price with English numerals
  const fmtPrice = (price: number): string => {
    return toEnNum(price.toLocaleString("ar-EG"));
  };

  // Format date with English numerals
  const fmtDate = (dateStr: string): string => {
    return toEnNum(dateStr);
  };

  const handleDownloadPng = async () => {
    if (!invoiceRef.current) return;
    setDownloading(true);
    try {
      // Dynamic import of html2canvas to reduce bundle size
      const html2canvas = (await import("html2canvas")).default;
      await new Promise((r) => setTimeout(r, 500));
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const dataUrl = canvas.toDataURL("image/png", 1.0);
      const link = document.createElement("a");
      link.download = `invoice_${order?.id || "order"}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to generate PNG:", err);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    const printContent = invoiceRef.current;
    if (!printContent) return;
    const printWindow = window.open("", "_blank", "width=500,height=700");
    if (!printWindow) return;
    printWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>فاتورة ${order?.id || ""}</title>
          <style>
            @page { size: A6; margin: 0; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Tahoma, Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            img { max-width: 100%; }
          </style>
        </head>
        <body>
          ${printContent.outerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  if (!order) return null;

  // Resolve order items with product data
  const orderItems = order.items.map((item) => {
    const p = products.find((x) => x.id === item.id);
    const isGift = item.isGift === true;
    return {
      name: p?.name || "منتج محذوف",
      qty: item.qty,
      unitPrice: isGift ? 0 : (p ? calcFinalPrice(p.price, p.disc) : 0),
      totalPrice: isGift ? 0 : (p ? calcFinalPrice(p.price, p.disc) * item.qty : 0),
      disc: isGift ? 0 : (p?.disc || 0),
      originalPrice: isGift ? 0 : (p?.price || 0),
      isGift,
    };
  });

  const totalSavings = orderItems.reduce((sum, item) => {
    if (item.disc > 0) {
      return sum + (item.originalPrice - item.unitPrice) * item.qty;
    }
    return sum;
  }, 0);

  const storeName = siteSettings.storeName || "صيدليتي";
  const logoLetter = siteSettings.storeLogoLetter || "ص";

  // Status colors
  const statusStyles: Record<string, { bg: string; color: string }> = {
    "جديد": { bg: "#FFF3C4", color: "#C85A00" },
    "جاري التوصيل": { bg: "#DBEAFE", color: "#1D4ED8" },
    "تم التسليم": { bg: "#EAF3DE", color: "#2d8a4e" },
  };
  const currentStatus = statusStyles[order.status] || statusStyles["جديد"];

  // Order ID in English
  const orderIdEn = toEnNum(order.id.slice(1));

  return (
    <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>فاتورة الطلب</DialogTitle>
        </DialogHeader>

        {/* Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #F0E0C0", position: "sticky", top: 0, zIndex: 10, background: "white" }}>
          <h3 style={{ fontWeight: "bold", color: "#C85A00", display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", margin: 0 }}>
            <FileText size={18} />
            فاتورة الطلب
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={handlePrint}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", background: "#EAF3DE", color: "#2d8a4e", borderRadius: "12px", fontSize: "12px", fontWeight: 500, border: "none", cursor: "pointer" }}
            >
              <Printer size={14} />
              طباعة
            </button>
            <button
              onClick={handleDownloadPng}
              disabled={downloading}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", background: "#F07800", color: "white", borderRadius: "12px", fontSize: "12px", fontWeight: 500, border: "none", cursor: downloading ? "not-allowed" : "pointer", opacity: downloading ? 0.5 : 1 }}
            >
              <Download size={14} />
              {downloading ? "جاري التحميل..." : "تحميل PNG"}
            </button>
          </div>
        </div>

        {/* Invoice Content - ALL INLINE STYLES for html2canvas compatibility */}
        <div style={{ padding: "16px" }}>
          <div
            ref={invoiceRef}
            style={{
              width: "400px",
              margin: "0 auto",
              fontFamily: "Tahoma, Arial, sans-serif",
              direction: "rtl",
              background: "#ffffff",
              color: "#1A1A1A",
              lineHeight: "1.5",
            }}
          >
            {/* === Header Band === */}
            <div
              style={{
                background: "#F07800",
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                {siteSettings.storeLogoUrl ? (
                  <img
                    src={siteSettings.storeLogoUrl}
                    alt={storeName}
                    style={{ width: "36px", height: "36px", borderRadius: "6px", objectFit: "cover", border: "2px solid rgba(255,255,255,0.4)", marginLeft: "10px" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "6px",
                      background: "rgba(255,255,255,0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: "bold",
                      fontSize: "16px",
                      marginLeft: "10px",
                    }}
                  >
                    {logoLetter}
                  </div>
                )}
                <div>
                  <div style={{ color: "white", fontWeight: "bold", fontSize: "15px" }}>{storeName}</div>
                  <div style={{ color: "rgba(255,255,255,0.85)", fontSize: "9px" }}>فاتورة ضريبية مبسطة</div>
                </div>
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ color: "white", fontWeight: "bold", fontSize: "13px" }}>#{orderIdEn}</div>
                <div style={{ color: "rgba(255,255,255,0.85)", fontSize: "9px" }}>{fmtDate(order.date)}</div>
              </div>
            </div>

            {/* === Customer Section - LARGE for delivery readability === */}
            <div style={{ padding: "12px 16px 10px", borderBottom: "2px solid #F0E0C0", background: "#FFFCF5" }}>
              <div style={{ fontSize: "11px", fontWeight: "bold", color: "#F07800", marginBottom: "8px", borderBottom: "1px dashed #F0E0C0", paddingBottom: "4px" }}>بيانات العميل</div>
              {/* Customer Name - Very Large */}
              <div style={{ marginBottom: "6px" }}>
                <div style={{ fontSize: "9px", color: "#999", marginBottom: "2px" }}>اسم العميل</div>
                <div style={{ fontSize: "15px", fontWeight: "bold", color: "#1A1A1A", lineHeight: "1.4" }}>{order.name}</div>
              </div>
              {/* Phone - Very Large & Bold for quick reading */}
              <div style={{ marginBottom: "6px" }}>
                <div style={{ fontSize: "9px", color: "#999", marginBottom: "2px" }}>رقم التليفون</div>
                <div style={{ fontSize: "16px", fontWeight: "bold", color: "#C85A00", direction: "ltr", unicodeBidi: "embed", lineHeight: "1.4" }}>{toEnNum(order.phone)}</div>
              </div>
              {/* Governorate & Address side by side */}
              <div style={{ display: "flex", gap: "12px", marginBottom: "4px" }}>
                <div style={{ flex: "1" }}>
                  <div style={{ fontSize: "9px", color: "#999", marginBottom: "2px" }}>المحافظة</div>
                  <div style={{ fontSize: "13px", fontWeight: "bold", color: "#1A1A1A" }}>{order.gov}</div>
                </div>
                <div style={{ flex: "2" }}>
                  <div style={{ fontSize: "9px", color: "#999", marginBottom: "2px" }}>العنوان</div>
                  <div style={{ fontSize: "13px", fontWeight: "bold", color: "#1A1A1A" }}>{order.addr}</div>
                </div>
              </div>
              {order.notes && (
                <div style={{ marginTop: "6px", padding: "6px 8px", background: "#FFF3C4", borderRadius: "4px" }}>
                  <span style={{ fontSize: "10px", color: "#C85A00", fontWeight: "bold" }}>ملاحظات: </span>
                  <span style={{ fontSize: "11px", color: "#555" }}>{order.notes}</span>
                </div>
              )}
            </div>

            {/* === Items Section === */}
            <div style={{ padding: "10px 16px" }}>
              <div style={{ fontSize: "10px", fontWeight: "bold", color: "#F07800", marginBottom: "6px", borderBottom: "1px dashed #F0E0C0", paddingBottom: "3px" }}>تفاصيل الطلب</div>
              
              {/* Table Header */}
              <div style={{ display: "flex", borderBottom: "1.5px solid #F0E0C0", paddingBottom: "4px", marginBottom: "2px" }}>
                <div style={{ width: "40%", fontSize: "9px", color: "#999", fontWeight: "bold" }}>المنتج</div>
                <div style={{ width: "15%", fontSize: "9px", color: "#999", fontWeight: "bold", textAlign: "center" }}>الكمية</div>
                <div style={{ width: "22%", fontSize: "9px", color: "#999", fontWeight: "bold", textAlign: "center" }}>السعر</div>
                <div style={{ width: "23%", fontSize: "9px", color: "#999", fontWeight: "bold", textAlign: "left" }}>الإجمالي</div>
              </div>

              {/* Table Rows */}
              {orderItems.map((item, i) => (
                <div key={i} style={{ display: "flex", padding: "4px 0", borderBottom: "1px solid #F5F5F5", alignItems: "flex-start", opacity: item.isGift ? 0.8 : 1 }}>
                  <div style={{ width: "40%", fontSize: "10px", fontWeight: 600, color: item.isGift ? "#2d8a4e" : "#1A1A1A" }}>
                    <div>{item.name} {item.isGift && <span style={{ fontSize: "8px", background: "#EAF3DE", color: "#2d8a4e", padding: "1px 4px", borderRadius: "3px" }}>هدية</span>}</div>
                    {!item.isGift && item.disc > 0 && (
                      <div style={{ fontSize: "8px", color: "#F07800", marginTop: "1px" }}>خصم {item.disc}%</div>
                    )}
                  </div>
                  <div style={{ width: "15%", fontSize: "10px", color: "#555", textAlign: "center", paddingTop: "2px" }}>{item.qty}</div>
                  <div style={{ width: "22%", fontSize: "10px", color: item.isGift ? "#2d8a4e" : "#555", textAlign: "center", paddingTop: "2px" }}>
                    {item.isGift ? (
                      <span style={{ fontWeight: 600 }}>مجاني</span>
                    ) : item.disc > 0 ? (
                      <div>
                        <div style={{ textDecoration: "line-through", fontSize: "8px", color: "#bbb" }}>{fmtPrice(item.originalPrice)}</div>
                        <div style={{ color: "#C85A00", fontWeight: 600 }}>{fmtPrice(item.unitPrice)}</div>
                      </div>
                    ) : (
                      fmtPrice(item.unitPrice)
                    )}
                  </div>
                  <div style={{ width: "23%", fontSize: "10px", fontWeight: "bold", color: item.isGift ? "#2d8a4e" : "#1A1A1A", textAlign: "left", paddingTop: "2px" }}>
                    {item.isGift ? "مجاني" : fmtPrice(item.totalPrice)}
                  </div>
                </div>
              ))}
            </div>

            {/* === Totals Section === */}
            <div style={{ padding: "8px 16px", borderTop: "1px dashed #F0E0C0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", padding: "2px 0" }}>
                <span style={{ color: "#777" }}>المجموع الفرعي</span>
                <span style={{ fontWeight: 500, color: "#333" }}>{fmtPrice(order.total)} EGP</span>
              </div>
              {totalSavings > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", padding: "2px 0" }}>
                  <span style={{ color: "#777" }}>الخصم</span>
                  <span style={{ fontWeight: 500, color: "#2d8a4e" }}>-{fmtPrice(totalSavings)} EGP</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", padding: "2px 0" }}>
                <span style={{ color: "#777" }}>الشحن</span>
                <span style={{ fontWeight: 500, color: "#333" }}>{order.total >= 300 ? "مجاني" : "يحدد لاحقاً"}</span>
              </div>
              <div style={{ borderTop: "2px solid #F07800", marginTop: "4px", paddingTop: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: "bold", fontSize: "13px", color: "#1A1A1A" }}>الإجمالي</span>
                <span style={{ fontWeight: "bold", fontSize: "15px", color: "#C85A00" }}>{fmtPrice(order.total)} EGP</span>
              </div>
            </div>

            {/* === Payment & Status === */}
            <div style={{ padding: "6px 16px", background: "#FFFBF0", borderTop: "1px solid #F0E0C0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "10px", fontWeight: "bold", color: "#2d8a4e" }}>الدفع عند الاستلام</span>
              <span
                style={{
                  fontSize: "9px",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  fontWeight: 600,
                  background: currentStatus.bg,
                  color: currentStatus.color,
                }}
              >
                {order.status}
              </span>
            </div>

            {/* === Footer === */}
            <div style={{ padding: "8px 16px", background: "#FAFAFA", borderTop: "1px solid #E5E5E5", textAlign: "center" }}>
              <div style={{ fontSize: "8px", color: "#999" }}>
                شكراً لتسوقكم من {storeName} — منتجات أصلية 100% | استرجاع خلال 7 أيام
              </div>
              {siteSettings.facebookUrl && (
                <div style={{ fontSize: "8px", color: "#bbb", marginTop: "2px", direction: "ltr", unicodeBidi: "embed" }}>
                  {siteSettings.facebookUrl}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Return Policy ─── */
function PolicyPage() {
  const { setCurrentView, siteSettings } = useShopStore();
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button
        onClick={() => useShopStore.getState().navigateTo("catalog")}
        className="text-[#777] hover:text-[#F07800] text-sm mb-4 flex items-center gap-1 transition"
      >
        <ArrowRight size={16} />
        {siteSettings.policyBackToStore || "الرجوع للمتجر"}
      </button>

      <h2 className="text-xl font-bold text-[#1A1A1A] mb-6">{siteSettings.policyPageTitle || "سياسة الاسترجاع والشحن"}</h2>

      <div className="space-y-4">
        {[
          {
            icon: <RotateCcw size={20} className="text-[#F07800]" />,
            title: siteSettings.policyReturnTitle || "سياسة الاسترجاع",
            content:
              siteSettings.policyReturnContent || "تقدر ترجع المنتج خلال 7 أيام من استلامه لو مش أصلي أو فيه عيب صناعي. المنتج لازم يكون في حالته الأصلية بدون استخدام. هنستلم المنتج منك ونرجعلك فلوسك فوراً.",
          },
          {
            icon: <Truck size={20} className="text-[#F07800]" />,
            title: siteSettings.policyShippingTitle || "الشحن والتوصيل",
            content:
              siteSettings.policyShippingContent || "التوصيل خلال 4 أيام حسب المحافظة. التوصيل مجاني للطلبات فوق 300 ج.م. للطلبات تحت 300 ج.م مصاريف الشحن بتحدد حسب المحافظة وبتتضاف عند التوصيل.",
          },
          {
            icon: <CreditCard size={20} className="text-[#F07800]" />,
            title: siteSettings.policyPaymentTitle || "طرق الدفع",
            content:
              siteSettings.policyPaymentContent || "الدفع عند الاستلام فقط — مفيش أي دفع إلكتروني أو تحويل بنكي. استلم المنتج، اتأكد إنه أصلي وبعدين ادفع لمندوب التوصيل. ده عشان نحافظ على ثقتك واطمئنانك.",
          },
          {
            icon: <Shield size={20} className="text-[#F07800]" />,
            title: siteSettings.policyAuthTitle || "ضمان الأصالة",
            content:
              siteSettings.policyAuthContent || "كل منتجاتنا أصلية 100% ومن مصادر موثوقة. لو لا قيت المنتج مش أصلي، ترجعه واحنا نرجعلك فلوسك كاملة زي ما وعدناك.",
          },
          {
            icon: <Phone size={20} className="text-[#F07800]" />,
            title: siteSettings.policyContactTitle || "التواصل والدعم",
            content:
              siteSettings.policyContactContent || "لو عندك أي سؤال أو مشكلة، تواصل معانا على صفحتنا على فيسبوك 'صيدليتي' أو زور موقعنا. فريقنا موجود لمساعدتك في أي وقت.",
          },
        ].map((section, i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#F0E0C0] p-5 hover:shadow-lg hover:shadow-[#F07800]/5 transition-all duration-300 hover:-translate-y-0.5 card-glow">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl bg-[#FFF8E8] flex items-center justify-center">
                {section.icon}
              </div>
              <h3 className="font-bold text-[#1A1A1A]">{section.title}</h3>
            </div>
            <p className="text-sm text-[#555] leading-relaxed">
              {section.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Footer ─── */
function Footer() {
  const { siteSettings } = useShopStore();
  return (
    <footer className="bg-gradient-to-b from-[#1A1A1A] to-[#0D0D0D] text-white mt-auto relative">
      <div className="h-[2px] bg-gradient-to-l from-transparent via-[#F07800] to-[#F5C400] via-[#F07800]" />
      {/* Subtle glow at top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-8 bg-[#F07800]/5 blur-2xl pointer-events-none" />
      <div className="py-5 px-3 text-center relative">
        <div className="flex items-center justify-center gap-2 mb-2 opacity-20">
          <div className="w-8 h-[1px] bg-gradient-to-l from-transparent to-[#F07800]" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#F07800]" />
          <div className="w-8 h-[1px] bg-gradient-to-r from-transparent to-[#F07800]" />
        </div>
        <p className="text-xs text-gray-500">
          © {new Date().getFullYear()} {siteSettings.copyrightText || "صيدليتي — جميع الحقوق محفوظة"}
        </p>
      </div>
    </footer>
  );
}

/* ─── Messenger Float ─── */
function MessengerFloat() {
  const { siteSettings } = useShopStore();
  const messengerUrl = siteSettings.messengerUrl || "https://m.me/saydaliti";
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [opening, setOpening] = useState(false);
  const [opened, setOpened] = useState(false);

  const handleMessengerClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!messengerUrl || opening) return;

    // Show immediate feedback
    setOpening(true);
    setTooltipVisible(false);

    // Small delay so user sees the "opening" state
    setTimeout(() => {
      const newWindow = window.open(messengerUrl, "_blank");
      if (!newWindow || newWindow.closed) {
        window.location.href = messengerUrl;
      }
      // Show "opened" confirmation
      setOpening(false);
      setOpened(true);
      // Reset after 2 seconds
      setTimeout(() => setOpened(false), 2000);
    }, 300);
  }, [messengerUrl, opening]);

  if (!messengerUrl) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2">
      {/* Status Toast — shows when opening or opened */}
      {(opening || opened) && (
        <div className={`rounded-2xl px-4 py-2.5 shadow-xl border whitespace-nowrap animate-scale-fade-in ${
          opened
            ? "bg-emerald-50 border-emerald-200 shadow-emerald-500/20"
            : "bg-blue-50 border-blue-200 shadow-blue-500/20"
        }`}>
          {opened ? (
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-500" />
              <span className="text-sm font-bold text-emerald-600">تم فتح ماسنجر ✓</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-[#0084FF] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-bold text-[#0084FF]">جاري فتح ماسنجر...</span>
            </div>
          )}
        </div>
      )}
      {/* Tooltip bubble — only when idle */}
      {tooltipVisible && !opening && !opened && (
        <div className="bg-white rounded-2xl px-4 py-2.5 shadow-xl shadow-blue-500/20 border border-blue-100 animate-scale-fade-in whitespace-nowrap">
          <p className="text-sm font-bold text-[#0084FF]">تواصل معانا على ماسنجر</p>
          <p className="text-[10px] text-[#888]">رد سريع • متاح ٢٤ ساعة</p>
        </div>
      )}
      {/* Messenger Button */}
      <button
        onClick={handleMessengerClick}
        onMouseEnter={() => !opening && !opened && setTooltipVisible(true)}
        onMouseLeave={() => setTooltipVisible(false)}
        onTouchStart={() => !opening && !opened && setTooltipVisible(true)}
        className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all group cursor-pointer border-0 outline-none ${
          opening
            ? "scale-95 shadow-2xl shadow-[#0084FF]/60"
            : opened
            ? "scale-110 shadow-2xl shadow-emerald-500/40"
            : "shadow-[#0084FF]/40 hover:shadow-2xl hover:shadow-[#0084FF]/50 hover:scale-110 active:scale-95"
        }`}
        style={{
          background: opened
            ? "linear-gradient(135deg, #10B981 0%, #059669 100%)"
            : "linear-gradient(135deg, #0084FF 0%, #0066E0 50%, #0052CC 100%)",
        }}
        title="تواصل معانا على ماسنجر"
        aria-label="تواصل معانا على ماسنجر"
      >
        {/* Glowing ring effect — pointer-events-none so it never blocks clicks */}
        {!opening && !opened && (
          <div className="absolute inset-0 rounded-full bg-[#0084FF]/30 animate-ping-slow pointer-events-none" />
        )}
        {/* Pulse ring border — hide during interactions */}
        {!opening && !opened && (
          <div className="absolute -inset-1 rounded-full border-2 border-[#0084FF]/40 animate-pulse pointer-events-none" />
        )}
        {/* Opening spinner overlay */}
        {opening && (
          <div className="absolute inset-0 rounded-full bg-black/20 flex items-center justify-center pointer-events-none">
            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {/* Icon: check when opened, messenger when idle */}
        {opened ? (
          <CheckCircle size={26} className="relative z-10 text-white" />
        ) : (
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            className={`relative z-10 ${opening ? "opacity-40" : "group-hover:scale-110"} transition-transform`}
          >
            <path
              d="M12 2C6.477 2 2 6.145 2 11.243c0 2.907 1.452 5.497 3.727 7.2.194.145.306.377.297.621l-.096 2.306a.75.75 0 001.052.703l2.583-1.076a.925.925 0 01.63-.048c.874.237 1.804.365 2.807.365 5.523 0 10-4.145 10-9.243S17.523 2 12 2z"
              fill="white"
            />
            <path
              d="M8.5 12.5l2-5 2.5 3 2.5-3-0.5 5"
              stroke="#0084FF"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        )}
      </button>
    </div>
  );
}

/* ─── Main App ─── */
export default function Home() {
  const {
    currentView,
    setCurrentView,
    products,
    categories,
    setProducts,
    setCategories,
    syncFromDatabase,
    startPolling,
    stopPolling,
    isAdminUnlocked,
    setAdminUnlocked,
    siteSettings,
    syncViewFromURL,
    isLoading,
  } = useShopStore();
  const [loaded, setLoaded] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      // Load data from database (with localStorage fallback)
      await syncFromDatabase();
      // If still no products, set defaults locally
      if (useShopStore.getState().products.length === 0) {
        setProducts(DEFAULT_PRODUCTS);
      }
      // If still no categories, set defaults locally
      if (useShopStore.getState().categories.length === 0) {
        setCategories(DEFAULT_CATEGORIES);
      }
      // Sync view from URL on initial load
      syncViewFromURL();
      // Start polling for real-time updates
      startPolling();
      setLoaded(true);
    };
    initApp();
    // Stop polling when component unmounts
    return () => {
      stopPolling();
    };
  }, []);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      syncViewFromURL();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [syncViewFromURL]);

  // Listen for admin login trigger from Header
  useEffect(() => {
    const handler = () => {
      if (!useShopStore.getState().isAdminUnlocked) {
        setAdminLoginOpen(true);
      }
    };
    window.addEventListener("show-admin-login", handler);
    return () => window.removeEventListener("show-admin-login", handler);
  }, []);

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFBF0] bg-pattern">
        <div className="w-12 h-12 border-[3px] border-[#F0E0C0] border-t-[#F07800] rounded-full animate-spin-slow" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Header />

      <main className="flex-1">
        {currentView === "catalog" && (
          <div key="catalog" className="page-transition">
            <HeroSection />
            <OffersMarketingSection />
            <CatalogSection />
          </div>
        )}
        {currentView === "productDetail" && (
          <div key="productDetail" className="page-transition-left">
            <ProductDetailPage />
          </div>
        )}
        {currentView === "checkout" && (
          <div key="checkout" className="page-transition-left">
            <CheckoutPage />
          </div>
        )}
        {currentView === "success" && (
          <div key="success" className="page-transition-scale">
            <SuccessPage />
          </div>
        )}
        {currentView === "admin" && isAdminUnlocked && (
          <div key="admin" className="page-transition">
            <AdminPanel />
          </div>
        )}
        {/* Admin login screen when URL is /admin but not unlocked */}
        {currentView === "admin" && !isAdminUnlocked && (
          <div key="admin-login" className="page-transition">
            <AdminLoginScreen onSuccess={() => setAdminUnlocked(true)} />
          </div>
        )}

        {/* Admin Password Dialog */}
        <AdminPasswordDialog
          open={adminLoginOpen}
          onClose={() => setAdminLoginOpen(false)}
        />
        {currentView === "policy" && (
          <div key="policy" className="page-transition">
            <PolicyPage />
          </div>
        )}
      </main>

      <Footer />
      <CartSheet />
      <InvoiceDialog />
      <CartFlashToast />
      <MessengerFloat />
      <ScrollToTopButton />

      {/* Mobile viewport overlay - visual frame around the site on mobile */}
      <style>{`
        @media (max-width: 639px) {
          html {
            zoom: ${siteSettings.mobileZoom === "100" ? 1 : Number(siteSettings.mobileZoom) / 100};
          }
          body {
            padding: ${siteSettings.mobilePadding}px;
            background: linear-gradient(135deg, #F0E0C0, #E8D5B0);
          }
          body > .min-h-screen {
            max-width: ${siteSettings.mobileViewport === "full" ? "100%" : siteSettings.mobileViewport === "padded" ? "512px" : siteSettings.mobileViewport === "card" ? "384px" : "320px"};
            margin: 0 auto;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1), 0 0 0 1px rgba(240,120,0,0.1);
          }
        }
      `}</style>
    </div>
  );
}
