import { create } from "zustand";
import type { Product, CartItem, Order, Category, SiteSettings, Coupon, Gift, AppliedCoupon } from "./data";
import { DEFAULT_CATEGORIES, DEFAULT_SITE_SETTINGS, ADMIN_PASSWORD } from "./data";

interface ShopState {
  products: Product[];
  orders: Order[];
  cart: CartItem[];
  categories: Category[];
  siteSettings: SiteSettings;
  coupons: Coupon[];
  gifts: Gift[];
  appliedCoupon: AppliedCoupon | null;
  dismissedGifts: Set<number>; // gift IDs that user manually removed
  isAdminUnlocked: boolean;
  currentView:
    | "catalog"
    | "cart"
    | "checkout"
    | "success"
    | "admin"
    | "policy"
    | "productDetail";
  selectedProductId: number | null;
  cartOpen: boolean;
  adminTab: "products" | "orders" | "categories" | "appearance" | "texts" | "coupons" | "gifts";
  searchQuery: string;
  selectedCategory: string;
  sortBy: string;
  lastOrderId: string;
  lastOrderName: string;
  invoiceOrderId: string | null;
  invoiceOpen: boolean;
  isLoading: boolean;
  isSyncing: boolean;

  // Actions - Products
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  updateProduct: (id: number, product: Partial<Product>) => void;
  deleteProduct: (id: number) => void;

  // Actions - Categories
  setCategories: (categories: Category[]) => void;
  addCategory: (category: Category) => void;
  updateCategory: (id: number, updates: Partial<Category>) => void;
  deleteCategory: (id: number) => void;
  moveCategoryUp: (id: number) => void;
  moveCategoryDown: (id: number) => void;

  // Actions - Site Settings
  setSiteSettings: (settings: SiteSettings) => void;
  updateSiteSetting: <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => void;
  setAdminUnlocked: (unlocked: boolean) => void;

  // Actions - Orders
  addOrder: (order: Order) => void;
  updateOrderStatus: (
    id: string,
    status: "جديد" | "جاري التوصيل" | "تم التسليم"
  ) => void;
  deleteOrder: (id: string) => void;

  // Actions - Cart
  addToCart: (productId: number) => void;
  removeFromCart: (productId: number, isGift?: boolean) => void;
  changeQty: (productId: number, delta: number) => void;
  clearCart: () => void;
  getCartQty: (productId: number) => number;
  getCartTotal: () => number;

  // Actions - UI
  setCurrentView: (
    view:
      | "catalog"
      | "cart"
      | "checkout"
      | "success"
      | "admin"
      | "policy"
      | "productDetail"
  ) => void;
  navigateTo: (
    view:
      | "catalog"
      | "cart"
      | "checkout"
      | "success"
      | "admin"
      | "policy"
      | "productDetail",
    productId?: number | null,
    categoryId?: number | null
  ) => void;
  syncViewFromURL: () => void;
  setSelectedProductId: (id: number | null) => void;
  setCartOpen: (open: boolean) => void;
  setAdminTab: (tab: "products" | "orders" | "categories" | "appearance" | "texts" | "coupons" | "gifts") => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (cat: string) => void;
  setSortBy: (sort: string) => void;
  setLastOrderId: (id: string) => void;
  setLastOrderName: (name: string) => void;
  setInvoiceOrderId: (id: string | null) => void;
  setInvoiceOpen: (open: boolean) => void;

  // Actions - Coupons
  setCoupons: (coupons: Coupon[]) => void;
  addCoupon: (coupon: Coupon) => void;
  updateCoupon: (id: number, updates: Partial<Coupon>) => void;
  deleteCoupon: (id: number) => void;
  applyCoupon: (coupon: AppliedCoupon) => void;
  removeCoupon: () => void;
  getDiscountAmount: () => number;
  recalculateCouponDiscount: () => void;
  syncGiftItems: () => void;

  // Actions - Gifts
  setGifts: (gifts: Gift[]) => void;
  addGift: (gift: Gift) => void;
  updateGift: (id: number, updates: Partial<Gift>) => void;
  deleteGift: (id: number) => void;
  getQualifiedGifts: () => Gift[];

  // Database sync
  loadFromStorage: () => void;
  syncFromDatabase: () => Promise<void>;
  seedDatabase: () => Promise<void>;
}

const PKEY = "saydaliti_products_v2";
const OKEY = "saydaliti_orders_v2";
const CKEY = "saydaliti_cart_v2";
const CATKEY = "saydaliti_categories_v2";
const SKEY = "saydaliti_settings_v2";

function saveToStorage(key: string, data: unknown) {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, JSON.stringify(data));
    }
  } catch {
    // Storage full or unavailable
  }
}

function loadFromStorage<T>(key: string): T | null {
  try {
    if (typeof window !== "undefined") {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    }
  } catch {
    // Parse error
  }
  return null;
}

// Helper: make API call and handle errors silently
// Automatically includes admin auth header for write operations
async function apiCall(url: string, options?: RequestInit) {
  try {
    const headers: Record<string, string> = {};
    // Copy existing headers if any
    if (options?.headers) {
      const existingHeaders = options.headers as Record<string, string>;
      Object.assign(headers, existingHeaders);
    }
    // Add admin auth header for write operations (POST, PUT, DELETE)
    const method = options?.method?.toUpperCase() || "GET";
    if (method !== "GET") {
      headers["x-admin-auth"] = ADMIN_PASSWORD;
    }
    if (!headers["Content-Type"] && method !== "GET") {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      console.error(`API call failed: ${url}`, res.status, res.statusText);
      return null;
    }
    return await res.json();
  } catch (error) {
    console.error(`API call error: ${url}`, error);
    return null;
  }
}

// ─── Debounced Settings Sync ───
// Batch multiple setting changes into a single API call
let _settingsBatch: Record<string, unknown> = {};
let _settingsTimer: NodeJS.Timeout | null = null;
const SETTINGS_DEBOUNCE_MS = 500; // Wait 500ms before sending batch

function debouncedSettingsSync() {
  if (_settingsTimer) clearTimeout(_settingsTimer);
  _settingsTimer = setTimeout(() => {
    if (Object.keys(_settingsBatch).length > 0) {
      apiCall("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(_settingsBatch),
      });
      _settingsBatch = {};
    }
  }, SETTINGS_DEBOUNCE_MS);
}

export const useShopStore = create<ShopState>((set, get) => ({
  products: [],
  orders: [],
  cart: [],
  categories: [],
  siteSettings: DEFAULT_SITE_SETTINGS,
  coupons: [],
  gifts: [],
  appliedCoupon: null,
  dismissedGifts: new Set<number>(),
  isAdminUnlocked: false,
  currentView: "catalog",
  cartOpen: false,
  adminTab: "products",
  searchQuery: "",
  selectedCategory: "كل المنتجات",
  sortBy: "الأحدث",
  lastOrderId: "",
  lastOrderName: "",
  invoiceOrderId: null,
  invoiceOpen: false,
  selectedProductId: null,
  isLoading: true,
  isSyncing: false,

  // Products
  setProducts: (products) => {
    set({ products });
    saveToStorage(PKEY, products);
  },

  addProduct: (product) => {
    // First, add optimistically to local state
    const products = [...get().products, product];
    set({ products });
    saveToStorage(PKEY, products);
    // Sync to database - then update local state with real DB ID
    apiCall("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    }).then((created) => {
      if (created && created.id !== product.id) {
        // Update local state with the real auto-increment ID from database
        const updatedProducts = get().products.map((p) =>
          p.id === product.id ? { ...created } : p
        );
        set({ products: updatedProducts });
        saveToStorage(PKEY, updatedProducts);
        // Also update cart items that reference this product ID
        const updatedCart = get().cart.map((c) =>
          c.id === product.id ? { ...c, id: created.id } : c
        );
        if (updatedCart.some((c, i) => c.id !== get().cart[i]?.id)) {
          set({ cart: updatedCart });
          saveToStorage(CKEY, updatedCart);
        }
      }
    });
  },

  updateProduct: (id, updates) => {
    const products = get().products.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    );
    set({ products });
    saveToStorage(PKEY, products);
    // Sync to database
    apiCall(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  },

  deleteProduct: (id) => {
    const products = get().products.filter((p) => p.id !== id);
    const cart = get().cart.filter((c) => c.id !== id);
    set({ products, cart });
    saveToStorage(PKEY, products);
    saveToStorage(CKEY, cart);
    // Sync to database
    apiCall(`/api/products/${id}`, { method: "DELETE" });
  },

  // Categories
  setCategories: (categories) => {
    set({ categories });
    saveToStorage(CATKEY, categories);
  },

  addCategory: (category) => {
    const categories = [...get().categories, category];
    set({ categories });
    saveToStorage(CATKEY, categories);
    // Sync to database - then update with real DB ID
    apiCall("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(category),
    }).then((created) => {
      if (created && created.id !== category.id) {
        const updatedCategories = get().categories.map((c) =>
          c.id === category.id ? { ...created } : c
        );
        set({ categories: updatedCategories });
        saveToStorage(CATKEY, updatedCategories);
      }
    });
  },

  updateCategory: (id, updates) => {
    const categories = get().categories.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    );
    set({ categories });
    saveToStorage(CATKEY, categories);
    // Sync to database
    apiCall(`/api/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  },

  deleteCategory: (id) => {
    const category = get().categories.find((c) => c.id === id);
    const categories = get().categories.filter((c) => c.id !== id);
    // Update products that were in this category
    const products = get().products.map((p) =>
      p.cat === category?.name ? { ...p, cat: "عام" } : p
    );
    // Reset selected category if it was deleted
    const selectedCategory =
      get().selectedCategory === category?.name
        ? "كل المنتجات"
        : get().selectedCategory;
    set({ categories, products, selectedCategory });
    saveToStorage(CATKEY, categories);
    saveToStorage(PKEY, products);
    // Sync to database
    apiCall(`/api/categories/${id}`, { method: "DELETE" });
  },

  moveCategoryUp: (id) => {
    const categories = [...get().categories].sort((a, b) => a.order - b.order);
    const idx = categories.findIndex((c) => c.id === id);
    if (idx <= 0) return;
    const temp = categories[idx].order;
    categories[idx].order = categories[idx - 1].order;
    categories[idx - 1].order = temp;
    set({ categories });
    saveToStorage(CATKEY, categories);
    // Sync both categories to database
    apiCall(`/api/categories/${categories[idx].id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: categories[idx].order }),
    });
    apiCall(`/api/categories/${categories[idx - 1].id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: categories[idx - 1].order }),
    });
  },

  moveCategoryDown: (id) => {
    const categories = [...get().categories].sort((a, b) => a.order - b.order);
    const idx = categories.findIndex((c) => c.id === id);
    if (idx === -1 || idx >= categories.length - 1) return;
    const temp = categories[idx].order;
    categories[idx].order = categories[idx + 1].order;
    categories[idx + 1].order = temp;
    set({ categories });
    saveToStorage(CATKEY, categories);
    // Sync both categories to database
    apiCall(`/api/categories/${categories[idx].id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: categories[idx].order }),
    });
    apiCall(`/api/categories/${categories[idx + 1].id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: categories[idx + 1].order }),
    });
  },

  // Site Settings
  setSiteSettings: (settings) => {
    set({ siteSettings: settings });
    saveToStorage(SKEY, settings);
    // Sync to database
    apiCall("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
  },

  updateSiteSetting: (key, value) => {
    const siteSettings = { ...get().siteSettings, [key]: value };
    set({ siteSettings });
    saveToStorage(SKEY, siteSettings);
    // Debounced sync to database — batches multiple changes into one API call
    _settingsBatch[key] = value;
    debouncedSettingsSync();
  },

  setAdminUnlocked: (unlocked) => set({ isAdminUnlocked: unlocked }),

  // Orders
  addOrder: (order) => {
    const orders = [order, ...get().orders];
    set({ orders });
    saveToStorage(OKEY, orders);
    // Sync to database
    apiCall("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });
  },

  updateOrderStatus: (id, status) => {
    const orders = get().orders.map((o) =>
      o.id === id ? { ...o, status } : o
    );
    set({ orders });
    saveToStorage(OKEY, orders);
    // Sync to database
    apiCall(`/api/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  },

  deleteOrder: (id) => {
    const orders = get().orders.filter((o) => o.id !== id);
    set({ orders });
    saveToStorage(OKEY, orders);
    // Sync to database
    apiCall(`/api/orders/${id}`, { method: "DELETE" });
  },

  // Cart
  addToCart: (productId) => {
    const cart = [...get().cart];
    // Only find non-gift items to increment qty
    const existingIndex = cart.findIndex((c) => c.id === productId && !c.isGift);
    if (existingIndex >= 0) {
      // Clone the item to avoid direct mutation
      cart[existingIndex] = { ...cart[existingIndex], qty: cart[existingIndex].qty + 1 };
    } else {
      cart.push({ id: productId, qty: 1 });
    }
    // Clear dismissed gifts when adding items (user might re-qualify)
    set({ cart, dismissedGifts: new Set() });
    saveToStorage(CKEY, cart);
    // Sync gift items after cart change
    setTimeout(() => get().syncGiftItems(), 0);
    get().recalculateCouponDiscount();
  },

  removeFromCart: (productId, isGift?: boolean) => {
    // If isGift is specified, only remove items matching that flag
    // Otherwise remove the non-gift item (default behavior)
    const currentCart = get().cart;
    const cart = currentCart.filter((c) => {
      if (c.id !== productId) return true;
      if (isGift !== undefined) return c.isGift !== isGift;
      return c.isGift === true; // default: keep gift items, remove non-gift
    });

    // Track manually dismissed gifts
    if (isGift) {
      const removedGiftItem = currentCart.find((c) => c.id === productId && c.isGift && c.giftId);
      if (removedGiftItem && removedGiftItem.giftId) {
        const newDismissed = new Set(get().dismissedGifts);
        newDismissed.add(removedGiftItem.giftId);
        set({ dismissedGifts: newDismissed });
      }
    }

    // When removing a non-gift item, clear dismissed gifts (user might re-qualify)
    if (!isGift) {
      set({ dismissedGifts: new Set() });
    }

    set({ cart });
    saveToStorage(CKEY, cart);
    setTimeout(() => get().syncGiftItems(), 0);
    get().recalculateCouponDiscount();
  },

  changeQty: (productId, delta) => {
    const cart = [...get().cart];
    // Find non-gift item by productId
    const itemIndex = cart.findIndex((c) => c.id === productId && !c.isGift);
    if (itemIndex === -1) return;
    const newQty = cart[itemIndex].qty + delta;
    if (newQty <= 0) {
      const filtered = cart.filter((_, i) => i !== itemIndex);
      set({ cart: filtered });
      saveToStorage(CKEY, filtered);
    } else {
      // Clone the item to avoid direct mutation
      cart[itemIndex] = { ...cart[itemIndex], qty: newQty };
      set({ cart });
      saveToStorage(CKEY, cart);
    }
    setTimeout(() => get().syncGiftItems(), 0);
    get().recalculateCouponDiscount();
  },

  clearCart: () => {
    set({ cart: [], appliedCoupon: null });
    saveToStorage(CKEY, []);
  },

  getCartQty: (productId) => {
    const item = get().cart.find((c) => c.id === productId && !c.isGift);
    return item?.qty || 0;
  },

  getCartTotal: () => {
    const { cart, products } = get();
    return cart.reduce((total, item) => {
      // Skip gift items (free)
      if (item.isGift) return total;
      const product = products.find((p) => p.id === item.id);
      if (!product) return total;
      const finalPrice = Math.round(
        product.price * (1 - (product.disc || 0) / 100)
      );
      return total + finalPrice * item.qty;
    }, 0);
  },

  // UI
  setCurrentView: (currentView) => set({ currentView }),
  navigateTo: (view, productId, categoryId) => {
    set({ currentView: view });
    if (productId !== undefined) set({ selectedProductId: productId });
    // Update URL based on view
    if (typeof window !== "undefined") {
      const routes: Record<string, string> = {
        catalog: "/",
        cart: "/",
        checkout: "/checkout",
        success: "/success",
        admin: "/admin",
        policy: "/policy",
        productDetail: productId ? `/product/${productId}` : "/",
      };
      let targetPath = routes[view] || "/";
      // If navigating to catalog with a category, use category URL
      if (view === "catalog" && categoryId) {
        targetPath = `/category/${categoryId}`;
      }
      const currentPath = window.location.pathname;
      // Only push if path changed
      if (currentPath !== targetPath) {
        window.history.pushState({ view, productId, categoryId }, "", targetPath);
      }
    }
  },
  syncViewFromURL: () => {
    if (typeof window === "undefined") return;
    const path = window.location.pathname;
    if (path === "/checkout") {
      set({ currentView: "checkout" });
    } else if (path === "/success") {
      set({ currentView: "success" });
    } else if (path === "/admin") {
      set({ currentView: "admin" });
    } else if (path === "/policy") {
      set({ currentView: "policy" });
    } else if (path.startsWith("/product/")) {
      const id = parseInt(path.split("/product/")[1]);
      if (!isNaN(id)) {
        set({ currentView: "productDetail", selectedProductId: id });
      }
    } else if (path.startsWith("/category/")) {
      const catId = parseInt(path.split("/category/")[1]);
      if (!isNaN(catId)) {
        // Find the category name from categories
        const cat = get().categories.find((c) => c.id === catId);
        set({
          currentView: "catalog",
          selectedCategory: cat ? cat.name : "كل المنتجات",
        });
      } else {
        set({ currentView: "catalog" });
      }
    } else {
      set({ currentView: "catalog" });
    }
  },
  setSelectedProductId: (selectedProductId) => set({ selectedProductId }),
  setCartOpen: (cartOpen) => set({ cartOpen }),
  setAdminTab: (adminTab) => set({ adminTab }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setSortBy: (sortBy) => set({ sortBy }),
  setLastOrderId: (lastOrderId) => set({ lastOrderId }),
  setLastOrderName: (lastOrderName) => set({ lastOrderName }),
  setInvoiceOrderId: (invoiceOrderId) => set({ invoiceOrderId }),
  setInvoiceOpen: (invoiceOpen) => set({ invoiceOpen }),

  // Coupons
  setCoupons: (coupons) => set({ coupons }),
  addCoupon: (coupon) => {
    const coupons = [...get().coupons, coupon];
    set({ coupons });
    // Sync to database
    apiCall("/api/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(coupon),
    }).then((created) => {
      if (created) {
        const updatedCoupons = get().coupons.map((c) =>
          c.id === coupon.id ? { ...created } : c
        );
        set({ coupons: updatedCoupons });
      }
    });
  },
  updateCoupon: (id, updates) => {
    const coupons = get().coupons.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    );
    set({ coupons });
    apiCall(`/api/coupons/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  },
  deleteCoupon: (id) => {
    const coupons = get().coupons.filter((c) => c.id !== id);
    set({ coupons });
    apiCall(`/api/coupons/${id}`, { method: "DELETE" });
  },
  applyCoupon: (coupon) => set({ appliedCoupon: coupon }),
  removeCoupon: () => set({ appliedCoupon: null }),
  getDiscountAmount: () => {
    const { appliedCoupon, getCartTotal, cart, products } = get();
    if (!appliedCoupon) return 0;

    let applicableTotal: number;
    if (appliedCoupon.productIds && appliedCoupon.productIds.length > 0) {
      // Only calculate discount on products in the coupon's productIds
      applicableTotal = cart.reduce((total, item) => {
        if (item.isGift) return total;
        if (!appliedCoupon.productIds!.includes(item.id)) return total;
        const product = products.find((p) => p.id === item.id);
        if (!product) return total;
        const finalPrice = Math.round(product.price * (1 - (product.disc || 0) / 100));
        return total + finalPrice * item.qty;
      }, 0);
    } else {
      applicableTotal = getCartTotal();
    }

    if (appliedCoupon.type === "percentage") {
      return Math.round(applicableTotal * (appliedCoupon.value / 100));
    } else {
      return Math.min(appliedCoupon.value, applicableTotal);
    }
  },
  recalculateCouponDiscount: () => {
    const { appliedCoupon, getCartTotal, cart, coupons } = get();
    if (!appliedCoupon) return;
    const cartTotal = getCartTotal();
    // Check if coupon is still valid
    const localCoupon = coupons.find((c) => c.id === appliedCoupon.id);
    if (localCoupon && !localCoupon.active) {
      set({ appliedCoupon: null });
      return;
    }
    // Check if product-specific coupon still has applicable products in cart
    if (appliedCoupon.productIds && appliedCoupon.productIds.length > 0) {
      const hasApplicableProducts = cart.some(
        (item) => !item.isGift && appliedCoupon.productIds!.includes(item.id)
      );
      if (!hasApplicableProducts) {
        set({ appliedCoupon: null });
        return;
      }
    }
    // Check minOrder
    if (appliedCoupon.minOrder > 0 && cartTotal < appliedCoupon.minOrder) {
      set({ appliedCoupon: null });
      return;
    }
    // Discount is recalculated dynamically via getDiscountAmount
  },
  syncGiftItems: () => {
    const { gifts, cart, getCartTotal, dismissedGifts, products } = get();
    const cartTotal = getCartTotal();
    // Helper: get non-gift cart items product IDs
    const cartProductIds = cart.filter((ci) => !ci.isGift).map((ci) => ci.id);
    let updatedCart = [...cart];

    // Auto-add qualified gifts (unless dismissed by user)
    const activeGifts = gifts.filter((g) => g.active);
    for (const gift of activeGifts) {
      // Parse triggerProductIds from gift
      let triggerIds: number[] = [];
      try {
        triggerIds = Array.isArray(gift.triggerProductIds)
          ? gift.triggerProductIds as number[]
          : JSON.parse(String(gift.triggerProductIds || "[]"));
      } catch {
        triggerIds = [];
      }

      // Determine if gift is qualified
      let isQualified = false;
      if (triggerIds.length > 0) {
        // Gift triggers when at least one trigger product is in cart
        const hasTriggerProduct = cartProductIds.some((id) => triggerIds.includes(id));
        if (hasTriggerProduct) {
          // Check minOrder based on trigger products total (or cart total)
          if (gift.minOrder > 0) {
            // Calculate total of trigger products in cart
            const triggerTotal = cart.reduce((total, item) => {
              if (item.isGift) return total;
              if (!triggerIds.includes(item.id)) return total;
              const product = products.find((p) => p.id === item.id);
              if (!product) return total;
              const finalPrice = Math.round(product.price * (1 - (product.disc || 0) / 100));
              return total + finalPrice * item.qty;
            }, 0);
            isQualified = triggerTotal >= gift.minOrder;
          } else {
            isQualified = true;
          }
        }
      } else {
        // No trigger products specified - any product triggers (existing behavior)
        isQualified = cartTotal >= gift.minOrder;
      }

      const existingGiftItem = updatedCart.find((ci) => ci.giftId === gift.id);
      const isDismissed = dismissedGifts.has(gift.id);

      if (isQualified && !existingGiftItem && !isDismissed) {
        // Check if product is already in cart as non-gift
        const existingRegular = updatedCart.find((ci) => ci.id === gift.productId && !ci.isGift);
        if (existingRegular) {
          // Add separate gift entry
          updatedCart.push({ id: gift.productId, qty: 1, isGift: true, giftId: gift.id });
        } else {
          // Product not in cart, add as gift
          const existingGift = updatedCart.find((ci) => ci.id === gift.productId && ci.isGift);
          if (!existingGift) {
            updatedCart.push({ id: gift.productId, qty: 1, isGift: true, giftId: gift.id });
          }
        }
      } else if (!isQualified && existingGiftItem) {
        // Remove gift item if no longer qualified
        updatedCart = updatedCart.filter((ci) => ci.giftId !== gift.id);
        // Clear dismissal when no longer qualified (will re-add when qualified again)
        const newDismissed = new Set(dismissedGifts);
        newDismissed.delete(gift.id);
        if (newDismissed.size !== dismissedGifts.size) {
          set({ dismissedGifts: newDismissed });
        }
      }
    }

    // Remove gift items whose gift record no longer exists or is inactive
    updatedCart = updatedCart.filter((ci) => {
      if (!ci.isGift || !ci.giftId) return true;
      const giftRecord = gifts.find((g) => g.id === ci.giftId);
      return giftRecord && giftRecord.active;
    });

    if (JSON.stringify(updatedCart) !== JSON.stringify(cart)) {
      set({ cart: updatedCart });
      saveToStorage(CKEY, updatedCart);
    }
  },

  // Gifts
  setGifts: (gifts) => set({ gifts }),
  addGift: (gift) => {
    const gifts = [...get().gifts, gift];
    set({ gifts });
    apiCall("/api/gifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(gift),
    }).then((created) => {
      if (created) {
        const updatedGifts = get().gifts.map((g) =>
          g.id === gift.id ? { ...created } : g
        );
        set({ gifts: updatedGifts });
      }
    });
  },
  updateGift: (id, updates) => {
    const gifts = get().gifts.map((g) =>
      g.id === id ? { ...g, ...updates } : g
    );
    set({ gifts });
    apiCall(`/api/gifts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  },
  deleteGift: (id) => {
    const gifts = get().gifts.filter((g) => g.id !== id);
    set({ gifts });
    apiCall(`/api/gifts/${id}`, { method: "DELETE" });
  },
  getQualifiedGifts: () => {
    const { gifts, getCartTotal, cart, products } = get();
    const cartTotal = getCartTotal();
    const cartProductIds = cart.filter((ci) => !ci.isGift).map((ci) => ci.id);

    return gifts.filter((g) => {
      if (!g.active) return false;

      // Parse triggerProductIds
      let triggerIds: number[] = [];
      try {
        triggerIds = Array.isArray(g.triggerProductIds)
          ? g.triggerProductIds as number[]
          : JSON.parse(String(g.triggerProductIds || "[]"));
      } catch {
        triggerIds = [];
      }

      if (triggerIds.length > 0) {
        const hasTriggerProduct = cartProductIds.some((id) => triggerIds.includes(id));
        if (!hasTriggerProduct) return false;
        if (g.minOrder > 0) {
          const triggerTotal = cart.reduce((total, item) => {
            if (item.isGift) return total;
            if (!triggerIds.includes(item.id)) return total;
            const product = products.find((p) => p.id === item.id);
            if (!product) return total;
            const finalPrice = Math.round(product.price * (1 - (product.disc || 0) / 100));
            return total + finalPrice * item.qty;
          }, 0);
          return triggerTotal >= g.minOrder;
        }
        return true;
      } else {
        return cartTotal >= g.minOrder;
      }
    });
  },

  loadFromStorage: () => {
    const products = loadFromStorage<Product[]>(PKEY);
    const orders = loadFromStorage<Order[]>(OKEY);
    const cart = loadFromStorage<CartItem[]>(CKEY);
    const categories = loadFromStorage<Category[]>(CATKEY);
    const siteSettings = loadFromStorage<SiteSettings>(SKEY);
    if (products) set({ products });
    if (orders) set({ orders });
    if (cart) set({ cart });
    if (categories) set({ categories });
    if (siteSettings) set({ siteSettings });
  },

  // Load data from database API
  syncFromDatabase: async () => {
    if (get().isSyncing) return;
    set({ isSyncing: true });

    try {
      // First, try to seed if database is empty
      await apiCall("/api/seed", { method: "POST" });

      // Fetch all data from API in parallel
      const [products, categories, orders, settings, coupons, gifts] = await Promise.all([
        apiCall("/api/products"),
        apiCall("/api/categories"),
        apiCall("/api/orders"),
        apiCall("/api/settings"),
        apiCall("/api/coupons"),
        apiCall("/api/gifts"),
      ]);

      // Update state with database data (fallback to localStorage)
      if (products && Array.isArray(products) && products.length > 0) {
        // Ensure images field exists on all products (backward compatibility)
        const normalizedProducts = products.map((p: Record<string, unknown>) => ({
          ...p,
          images: Array.isArray(p.images) ? p.images : (typeof p.images === 'string' ? (() => { try { return JSON.parse(p.images || '[]'); } catch { return []; } })() : []),
          video: typeof p.video === 'string' ? p.video : (p.video || ''),
        }));
        set({ products: normalizedProducts as Product[] });
        saveToStorage(PKEY, normalizedProducts);
      } else {
        // Fallback to localStorage
        const localProducts = loadFromStorage<Product[]>(PKEY);
        if (localProducts) {
          // Ensure images field exists on all products (backward compatibility)
          const normalizedLocal = localProducts.map((p) => ({
            ...p,
            images: p.images || [],
            video: p.video || '',
          }));
          set({ products: normalizedLocal });
        }
      }

      if (categories && Array.isArray(categories) && categories.length > 0) {
        set({ categories });
        saveToStorage(CATKEY, categories);
      } else {
        const localCategories = loadFromStorage<Category[]>(CATKEY);
        if (localCategories) set({ categories: localCategories });
        else set({ categories: DEFAULT_CATEGORIES });
      }

      if (orders && Array.isArray(orders)) {
        set({ orders });
        saveToStorage(OKEY, orders);
      } else {
        const localOrders = loadFromStorage<Order[]>(OKEY);
        if (localOrders) set({ orders: localOrders });
      }

      if (settings) {
        set({ siteSettings: settings });
        saveToStorage(SKEY, settings);
      } else {
        const localSettings = loadFromStorage<SiteSettings>(SKEY);
        if (localSettings) set({ siteSettings: localSettings });
      }

      // Load cart from localStorage only (cart is per-user, not shared)
      const cart = loadFromStorage<CartItem[]>(CKEY);
      if (cart) set({ cart });

      // Load coupons from database - parse productIds from JSON string
      if (coupons && Array.isArray(coupons)) {
        const parsedCoupons = coupons.map((c: Record<string, unknown>) => ({
          ...c,
          productIds: (() => {
            if (Array.isArray(c.productIds)) return c.productIds;
            if (typeof c.productIds === "string") { try { return JSON.parse(c.productIds || "[]"); } catch { return []; } }
            return [];
          })(),
        }));
        set({ coupons: parsedCoupons as Coupon[] });
      } else {
        const localCoupons = loadFromStorage<Coupon[]>('saydaliti_coupons');
        if (localCoupons) set({ coupons: localCoupons });
      }

      // Load gifts from database - parse triggerProductIds from JSON string
      if (gifts && Array.isArray(gifts)) {
        const parsedGifts = gifts.map((g: Record<string, unknown>) => ({
          ...g,
          triggerProductIds: (() => {
            if (Array.isArray(g.triggerProductIds)) return g.triggerProductIds;
            if (typeof g.triggerProductIds === "string") { try { return JSON.parse(g.triggerProductIds || "[]"); } catch { return []; } }
            return [];
          })(),
        }));
        set({ gifts: parsedGifts as Gift[] });
      } else {
        const localGifts = loadFromStorage<Gift[]>('saydaliti_gifts');
        if (localGifts) set({ gifts: localGifts });
      }

      // Sync gift items after loading all data
      setTimeout(() => get().syncGiftItems(), 100);

    } catch (error) {
      console.error("syncFromDatabase error:", error);
      // Fallback to localStorage
      get().loadFromStorage();
    } finally {
      set({ isLoading: false, isSyncing: false });
    }
  },

  seedDatabase: async () => {
    const result = await apiCall("/api/seed", { method: "POST" });
    if (result) {
      // Reload from database after seeding
      await get().syncFromDatabase();
    }
  },
}));
