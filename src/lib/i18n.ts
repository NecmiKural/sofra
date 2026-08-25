/** Localized JSON helpers. Content strings are stored as {"tr":"...","en":"..."}. */

export function tj(json: string | null | undefined, lang: string, fallback = "en"): string {
  if (!json) return "";
  try {
    const obj = JSON.parse(json) as Record<string, string>;
    return obj[lang] || obj[fallback] || Object.values(obj)[0] || "";
  } catch {
    return json;
  }
}

export function packJson(values: Record<string, string>): string {
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) if (v && v.trim()) clean[k] = v.trim();
  return JSON.stringify(clean);
}

/** Guest-facing UI strings. */
const dict = {
  tr: {
    menu: "MENÜ",
    welcome: "Hoş geldiniz!",
    table: "Masa",
    callWaiter: "Garson çağır",
    requestBill: "Hesap iste",
    waiterCalled: "Garson çağrıldı",
    billRequested: "Hesap istendi",
    onTheWay: "Görüldü, geliyor",
    cart: "Sepet",
    order: "Sipariş ver",
    orders: "Siparişlerim",
    add: "Ekle",
    remove: "Kaldır",
    total: "Toplam",
    note: "Not (isteğe bağlı)",
    sendOrder: "Siparişi gönder",
    orderSent: "Siparişiniz alındı",
    payOnline: "Online öde",
    payNow: "Şimdi öde",
    paid: "Ödendi",
    pending: "Bekliyor",
    preparing: "Hazırlanıyor",
    done: "Tamamlandı",
    cancelled: "İptal",
    empty: "Sepetiniz boş.",
    chooseOne: "1 seçin",
    chooseAny: "İstediğinizi seçin",
    required: "zorunlu",
    min: "dk",
    popular: "Popüler",
    vegetarian: "Vejetaryen",
    vegan: "Vegan",
    spicy: "Acı",
    glutenfree: "Glutensiz",
    unavailable: "Bugün yok",
    poweredBy: "Sofra ile hazırlandı",
    close: "Kapat",
    qty: "Adet",
    payTitle: "Masa hesabı",
    nothingToPay: "Ödenecek açık sipariş yok.",
    paymentSuccess: "Ödeme alındı, teşekkürler!",
    paymentFailed: "Ödeme başarısız oldu.",
    billHint: "Personel hesabınızı masanıza getirecek.",
  },
  en: {
    menu: "MENU",
    welcome: "Welcome!",
    table: "Table",
    callWaiter: "Call waiter",
    requestBill: "Request bill",
    waiterCalled: "Waiter called",
    billRequested: "Bill requested",
    onTheWay: "Seen, on the way",
    cart: "Cart",
    order: "Order",
    orders: "My orders",
    add: "Add",
    remove: "Remove",
    total: "Total",
    note: "Note (optional)",
    sendOrder: "Send order",
    orderSent: "Order received",
    payOnline: "Pay online",
    payNow: "Pay now",
    paid: "Paid",
    pending: "Pending",
    preparing: "Preparing",
    done: "Done",
    cancelled: "Cancelled",
    empty: "Your cart is empty.",
    chooseOne: "Choose 1",
    chooseAny: "Choose any",
    required: "required",
    min: "min",
    popular: "Popular",
    vegetarian: "Vegetarian",
    vegan: "Vegan",
    spicy: "Spicy",
    glutenfree: "Gluten-free",
    unavailable: "Not available today",
    poweredBy: "Powered by Sofra",
    close: "Close",
    qty: "Qty",
    payTitle: "Table bill",
    nothingToPay: "No open orders to pay.",
    paymentSuccess: "Payment received, thank you!",
    paymentFailed: "Payment failed.",
    billHint: "Staff will bring the bill to your table.",
  },
} as const;

export type GuestLang = keyof typeof dict;
export type GuestDict = Record<keyof (typeof dict)["en"], string>;

export function guestDict(lang: string): GuestDict {
  return (dict as unknown as Record<string, GuestDict>)[lang] ?? dict.en;
}

export const TAGS = ["popular", "vegetarian", "vegan", "spicy", "glutenfree"] as const;
