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
    orders: "Masa siparişleri",
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
    tableBusy: "Masanızdan {n} sipariş şu an hazırlanıyor.",
    tableBusyHint: "Aynı şeyi iki kez ısmarlamamak için önce masanın siparişlerine bakın.",
    viewTableOrders: "Masanın siparişlerini gör",
    cartShared: "Bu sepet masanın ortak sepeti. Masadaki herkes ekleyip çıkarabilir.",
    cartFull: "Sepet dolu. Önce mevcut siparişi gönderin.",
    cartFailed: "Sepet güncellenemedi, tekrar deneyin.",
    cartAlreadySent: "Masanızdan biri siparişi az önce göndermiş.",
    orderFailed: "Sipariş gönderilemedi, tekrar deneyin.",
    billRemaining: "Kalan hesap",
    billPaidSoFar: "{amount} ödendi",
    billSettled: "Masa hesabı kapandı ✓",
    payAll: "Tümünü öde",
    paySplit: "Bölüşerek öde",
    payCustom: "Tutar gir",
    people: "Kişi sayısı",
    perPerson: "Kişi başı öde",
    splitHint: "Herkes kendi telefonundan bu tutarı öder. Kalan tutar herkeste anında güncellenir.",
    amount: "Ödemek istediğiniz tutar",
    pay: "Öde",
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
    orders: "Table orders",
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
    tableBusy: "{n} order(s) from your table are being prepared.",
    tableBusyHint: "Check the table's orders first so nothing gets ordered twice.",
    viewTableOrders: "View table orders",
    cartShared: "This cart belongs to the whole table. Anyone seated here can add or remove.",
    cartFull: "The cart is full. Send the current order first.",
    cartFailed: "Could not update the cart, please try again.",
    cartAlreadySent: "Someone at your table just sent the order.",
    orderFailed: "Could not send the order, please try again.",
    billRemaining: "Remaining",
    billPaidSoFar: "{amount} paid",
    billSettled: "Table bill settled ✓",
    payAll: "Pay it all",
    paySplit: "Split the bill",
    payCustom: "Enter an amount",
    people: "People",
    perPerson: "Pay my share",
    splitHint: "Everyone pays this from their own phone. The remaining total updates for everyone at once.",
    amount: "Amount to pay",
    pay: "Pay",
  },
} as const;

export type GuestLang = keyof typeof dict;
export type GuestDict = Record<keyof (typeof dict)["en"], string>;

export function guestDict(lang: string): GuestDict {
  return (dict as unknown as Record<string, GuestDict>)[lang] ?? dict.en;
}

export const TAGS = ["popular", "vegetarian", "vegan", "spicy", "glutenfree"] as const;
