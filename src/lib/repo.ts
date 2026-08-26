/**
 * Typed data access layer over Prisma. All functions are async.
 *
 * Timestamps are stored as `DateTime` but crossing the API boundary as epoch
 * milliseconds, exactly like the previous integer columns did. The conversion
 * lives here so routes and components stay unchanged.
 */
import { Prisma } from "@prisma/client";
import type {
  Venue as VenueRecord,
  User as UserRecord,
  Table as TableRecord,
  Category as CategoryRecord,
  Payment as PaymentRecord,
} from "@prisma/client";
import { prisma } from "./db";
import { normalizeQty, packChoiceIds, priceLine, unpackChoiceIds } from "./pricing";

/* ---------------- types ---------------- */

export type Venue = {
  id: string;
  slug: string;
  name: string;
  welcomeJson: string;
  currency: string;
  languages: string; // comma separated
  defaultLang: string;
  themePrimary: string;
  themeMode: string;
  featureWaiter: boolean;
  featureBill: boolean;
  featureOrdering: boolean;
  featurePayments: boolean;
  paymentProvider: string;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  hours: string | null;
  address: string | null;
};

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  role: string;
  venueId: string;
};

export type TableRow = { id: string; venueId: string; number: number; label: string | null };

export type Category = {
  id: string;
  venueId: string;
  parentId: string | null;
  nameJson: string;
  sort: number;
};

export type Choice = {
  id: string;
  groupId: string;
  nameJson: string;
  priceDelta: number;
  priceAbsolute: number | null;
  sort: number;
};

export type Group = {
  id: string;
  itemId: string;
  nameJson: string;
  type: string;
  required: boolean;
  sort: number;
  choices: Choice[];
};

export type Item = {
  id: string;
  venueId: string;
  categoryId: string;
  nameJson: string;
  descJson: string;
  priceMinor: number;
  emoji: string | null;
  imageUrl: string | null;
  prepMinutes: number | null;
  tags: string;
  available: boolean;
  sort: number;
  optionGroups: Group[];
};

export type RequestRow = {
  id: string;
  venueId: string;
  tableId: string | null;
  tableNumber: number | null;
  type: string;
  status: string;
  createdAt: number;
};

export type OrderItemRow = {
  id: string;
  nameSnap: string;
  qty: number;
  unitPriceMinor: number;
  choicesSnap: string;
};

export type OrderRow = {
  id: string;
  venueId: string;
  tableId: string | null;
  tableNumber: number | null;
  status: string;
  totalMinor: number;
  note: string | null;
  paid: boolean;
  createdAt: number;
  items: OrderItemRow[];
};

export type PaymentRow = {
  id: string;
  venueId: string;
  tableNumber: number | null;
  orderIds: string;
  amountMinor: number;
  provider: string;
  status: string;
  providerRef: string | null;
  createdAt: number;
  paidAt: number | null;
};

/* ---------------- helpers ---------------- */

/** Insertion order used to be `rowid`; cuid ids are time-prefixed, so they sort the same way. */
const BY_SORT = [{ sort: "asc" }, { id: "asc" }] as Prisma.CategoryOrderByWithRelationInput[];

const HOURS_8 = 1000 * 60 * 60 * 8;
const since8h = () => new Date(Date.now() - HOURS_8);

function mapVenue(r: VenueRecord): Venue {
  return {
    id: r.id, slug: r.slug, name: r.name,
    welcomeJson: r.welcomeJson, currency: r.currency,
    languages: r.languages, defaultLang: r.defaultLang,
    themePrimary: r.themePrimary, themeMode: r.themeMode,
    featureWaiter: r.featureWaiter, featureBill: r.featureBill,
    featureOrdering: r.featureOrdering, featurePayments: r.featurePayments,
    paymentProvider: r.paymentProvider,
    phone: r.phone, whatsapp: r.whatsapp, instagram: r.instagram,
    hours: r.hours, address: r.address,
  };
}

function mapUser(r: UserRecord): User {
  return { id: r.id, email: r.email, passwordHash: r.passwordHash, name: r.name, role: r.role, venueId: r.venueId };
}

function mapTable(r: TableRecord): TableRow {
  return { id: r.id, venueId: r.venueId, number: r.number, label: r.label };
}

function mapCategory(r: CategoryRecord): Category {
  return { id: r.id, venueId: r.venueId, parentId: r.parentId, nameJson: r.nameJson, sort: r.sort };
}

/* ---------------- venues & users ---------------- */

export async function getVenueBySlug(slug: string): Promise<Venue | null> {
  const r = await prisma.venue.findUnique({ where: { slug } });
  return r ? mapVenue(r) : null;
}

export async function getVenueById(id: string): Promise<Venue | null> {
  const r = await prisma.venue.findUnique({ where: { id } });
  return r ? mapVenue(r) : null;
}

const VENUE_FIELDS = [
  "name", "welcomeJson", "currency", "languages", "defaultLang", "themePrimary",
  "themeMode", "featureWaiter", "featureBill", "featureOrdering", "featurePayments",
  "paymentProvider", "phone", "whatsapp", "instagram", "hours", "address",
] as const;

const VENUE_BOOLEANS: ReadonlySet<string> = new Set([
  "featureWaiter", "featureBill", "featureOrdering", "featurePayments",
]);

export async function updateVenue(id: string, patch: Record<string, unknown>): Promise<Venue | null> {
  const data: Record<string, unknown> = {};
  for (const f of VENUE_FIELDS) {
    if (!(f in patch)) continue;
    const v = patch[f];
    data[f] = VENUE_BOOLEANS.has(f) ? Boolean(v) : v == null ? null : String(v);
  }
  if (Object.keys(data).length) {
    await prisma.venue.updateMany({ where: { id }, data: data as Prisma.VenueUncheckedUpdateManyInput });
  }
  return getVenueById(id);
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const r = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  return r ? mapUser(r) : null;
}

export async function getUserById(id: string): Promise<User | null> {
  const r = await prisma.user.findUnique({ where: { id } });
  return r ? mapUser(r) : null;
}

/* ---------------- tables ---------------- */

export async function listTables(venueId: string): Promise<TableRow[]> {
  const rows = await prisma.table.findMany({ where: { venueId }, orderBy: { number: "asc" } });
  return rows.map(mapTable);
}

export async function getTableByNumber(venueId: string, number: number): Promise<TableRow | null> {
  if (!Number.isInteger(number)) return null;
  const r = await prisma.table.findUnique({ where: { venueId_number: { venueId, number } } });
  return r ? mapTable(r) : null;
}

export async function addTables(venueId: string, count: number): Promise<TableRow[]> {
  const max = await prisma.table.aggregate({ where: { venueId }, _max: { number: true } });
  let next = max._max.number ?? 0;
  const creates = Array.from({ length: count }, () => prisma.table.create({ data: { venueId, number: ++next } }));
  if (creates.length) await prisma.$transaction(creates);
  return listTables(venueId);
}

export async function updateTable(id: string, venueId: string, label: string | null) {
  await prisma.table.updateMany({ where: { id, venueId }, data: { label } });
}

export async function deleteTable(id: string, venueId: string) {
  await prisma.table.deleteMany({ where: { id, venueId } });
}

/* ---------------- categories ---------------- */

export async function listCategories(venueId: string): Promise<Category[]> {
  const rows = await prisma.category.findMany({ where: { venueId }, orderBy: BY_SORT });
  return rows.map(mapCategory);
}

export async function createCategory(venueId: string, nameJson: string, parentId: string | null): Promise<Category> {
  const max = await prisma.category.aggregate({ where: { venueId, parentId }, _max: { sort: true } });
  const row = await prisma.category.create({
    data: { venueId, parentId, nameJson, sort: (max._max.sort ?? -1) + 1 },
  });
  return mapCategory(row);
}

export async function updateCategory(
  id: string,
  venueId: string,
  patch: { nameJson?: string; sort?: number; parentId?: string | null }
) {
  const data: Prisma.CategoryUncheckedUpdateManyInput = {};
  if (patch.nameJson !== undefined) data.nameJson = patch.nameJson;
  if (patch.sort !== undefined) data.sort = patch.sort;
  if (patch.parentId !== undefined) data.parentId = patch.parentId;
  if (Object.keys(data).length) await prisma.category.updateMany({ where: { id, venueId }, data });
}

export async function deleteCategory(id: string, venueId: string) {
  await prisma.category.deleteMany({ where: { id, venueId } });
}

/* ---------------- items & options ---------------- */

const ITEM_INCLUDE = Prisma.validator<Prisma.MenuItemInclude>()({
  optionGroups: {
    orderBy: [{ sort: "asc" }, { id: "asc" }],
    include: { choices: { orderBy: [{ sort: "asc" }, { id: "asc" }] } },
  },
});

type ItemRecord = Prisma.MenuItemGetPayload<{ include: typeof ITEM_INCLUDE }>;

function mapItem(r: ItemRecord): Item {
  return {
    id: r.id, venueId: r.venueId, categoryId: r.categoryId,
    nameJson: r.nameJson, descJson: r.descJson, priceMinor: r.priceMinor,
    emoji: r.emoji, imageUrl: r.imageUrl, prepMinutes: r.prepMinutes,
    tags: r.tags, available: r.available, sort: r.sort,
    optionGroups: r.optionGroups.map((g) => ({
      id: g.id, itemId: g.itemId, nameJson: g.nameJson, type: g.type,
      required: g.required, sort: g.sort,
      choices: g.choices.map((c) => ({
        id: c.id, groupId: c.groupId, nameJson: c.nameJson,
        priceDelta: c.priceDelta, priceAbsolute: c.priceAbsolute, sort: c.sort,
      })),
    })),
  };
}

export async function listItems(venueId: string): Promise<Item[]> {
  const rows = await prisma.menuItem.findMany({
    where: { venueId },
    orderBy: [{ sort: "asc" }, { id: "asc" }],
    include: ITEM_INCLUDE,
  });
  return rows.map(mapItem);
}

export async function getItem(id: string, venueId: string): Promise<Item | null> {
  const r = await prisma.menuItem.findFirst({ where: { id, venueId }, include: ITEM_INCLUDE });
  return r ? mapItem(r) : null;
}

export type ItemPayload = {
  categoryId: string;
  nameJson: string;
  descJson: string;
  priceMinor: number;
  emoji?: string | null;
  imageUrl?: string | null;
  prepMinutes?: number | null;
  tags?: string;
  available?: boolean;
  optionGroups?: {
    nameJson: string;
    type: string;
    required?: boolean;
    choices: { nameJson: string; priceDelta?: number; priceAbsolute?: number | null }[];
  }[];
};

/** Option groups are always written as a whole: the payload replaces what exists. */
function groupCreateInput(groups: ItemPayload["optionGroups"]) {
  return (groups ?? []).map((g, gi) => ({
    nameJson: g.nameJson,
    type: g.type === "multi" ? "multi" : "single",
    required: Boolean(g.required),
    sort: gi,
    choices: {
      create: (g.choices ?? []).map((c, ci) => ({
        nameJson: c.nameJson,
        priceDelta: Math.round(c.priceDelta ?? 0),
        priceAbsolute: c.priceAbsolute == null ? null : Math.round(c.priceAbsolute),
        sort: ci,
      })),
    },
  }));
}

export async function createItem(venueId: string, p: ItemPayload): Promise<Item> {
  const max = await prisma.menuItem.aggregate({ where: { categoryId: p.categoryId }, _max: { sort: true } });
  const row = await prisma.menuItem.create({
    data: {
      venueId,
      categoryId: p.categoryId,
      nameJson: p.nameJson,
      descJson: p.descJson ?? "{}",
      priceMinor: Math.round(p.priceMinor),
      emoji: p.emoji ?? null,
      imageUrl: p.imageUrl ?? null,
      prepMinutes: p.prepMinutes ?? null,
      tags: p.tags ?? "",
      available: p.available !== false,
      sort: (max._max.sort ?? -1) + 1,
      optionGroups: { create: groupCreateInput(p.optionGroups) },
    },
    include: ITEM_INCLUDE,
  });
  return mapItem(row);
}

export async function updateItem(
  id: string,
  venueId: string,
  p: Partial<ItemPayload> & { sort?: number }
): Promise<Item | null> {
  const existing = await getItem(id, venueId);
  if (!existing) return null;

  await prisma.$transaction(async (tx) => {
    await tx.menuItem.update({
      where: { id },
      data: {
        categoryId: p.categoryId ?? existing.categoryId,
        nameJson: p.nameJson ?? existing.nameJson,
        descJson: p.descJson ?? existing.descJson,
        priceMinor: p.priceMinor != null ? Math.round(p.priceMinor) : existing.priceMinor,
        emoji: p.emoji !== undefined ? p.emoji : existing.emoji,
        imageUrl: p.imageUrl !== undefined ? p.imageUrl : existing.imageUrl,
        prepMinutes: p.prepMinutes !== undefined ? p.prepMinutes : existing.prepMinutes,
        tags: p.tags ?? existing.tags,
        available: p.available !== undefined ? p.available : existing.available,
        sort: p.sort ?? existing.sort,
      },
    });
    if (p.optionGroups !== undefined) {
      await tx.optionGroup.deleteMany({ where: { itemId: id } });
      for (const g of groupCreateInput(p.optionGroups)) {
        await tx.optionGroup.create({ data: { itemId: id, ...g } });
      }
    }
  });

  return getItem(id, venueId);
}

export async function deleteItem(id: string, venueId: string) {
  await prisma.menuItem.deleteMany({ where: { id, venueId } });
}

/* ---------------- requests ---------------- */

const REQ_INCLUDE = Prisma.validator<Prisma.RequestInclude>()({ table: { select: { number: true } } });

type RequestRecord = Prisma.RequestGetPayload<{ include: typeof REQ_INCLUDE }>;

const OPEN_STATUSES = ["open", "acked"];

function mapRequest(r: RequestRecord): RequestRow {
  return {
    id: r.id, venueId: r.venueId, tableId: r.tableId,
    tableNumber: r.table?.number ?? null,
    type: r.type, status: r.status, createdAt: r.createdAt.getTime(),
  };
}

export async function createRequest(venueId: string, tableId: string, type: "waiter" | "bill"): Promise<RequestRow> {
  const existing = await prisma.request.findFirst({
    where: { venueId, tableId, type, status: { in: OPEN_STATUSES } },
    include: REQ_INCLUDE,
  });
  if (existing) return mapRequest(existing);
  const row = await prisma.request.create({
    data: { venueId, tableId, type, status: "open" },
    include: REQ_INCLUDE,
  });
  return mapRequest(row);
}

export async function listTableRequests(venueId: string, tableId: string): Promise<RequestRow[]> {
  const rows = await prisma.request.findMany({
    where: { venueId, tableId, status: { in: OPEN_STATUSES } },
    include: REQ_INCLUDE,
  });
  return rows.map(mapRequest);
}

export async function listActiveRequests(venueId: string): Promise<RequestRow[]> {
  const rows = await prisma.request.findMany({
    where: { venueId, status: { in: OPEN_STATUSES } },
    orderBy: { createdAt: "asc" },
    include: REQ_INCLUDE,
  });
  return rows.map(mapRequest);
}

export async function setRequestStatus(id: string, venueId: string, status: string): Promise<RequestRow | null> {
  await prisma.request.updateMany({
    where: { id, venueId },
    data: { status, resolvedAt: status === "resolved" ? new Date() : null },
  });
  const r = await prisma.request.findUnique({ where: { id }, include: REQ_INCLUDE });
  return r ? mapRequest(r) : null;
}

/* ---------------- orders ---------------- */

const ORDER_INCLUDE = Prisma.validator<Prisma.OrderInclude>()({
  table: { select: { number: true } },
  items: { orderBy: [{ id: "asc" }] },
});

type OrderRecord = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

function mapOrder(r: OrderRecord): OrderRow {
  return {
    id: r.id, venueId: r.venueId, tableId: r.tableId,
    tableNumber: r.table?.number ?? null,
    status: r.status, totalMinor: r.totalMinor, note: r.note, paid: r.paid,
    createdAt: r.createdAt.getTime(),
    items: r.items.map((i) => ({
      id: i.id, nameSnap: i.nameSnap, qty: i.qty,
      unitPriceMinor: i.unitPriceMinor, choicesSnap: i.choicesSnap,
    })),
  };
}

export type OrderLineInput = { itemId: string; qty: number; choiceIds?: string[] };

type PricedLine = { itemId: string; nameSnap: string; qty: number; unitPriceMinor: number; choicesSnap: string };

/**
 * Price requested lines against the menu. The client's numbers are never
 * trusted: only the item id and quantity survive the trip. Unknown or
 * unavailable items are dropped rather than guessed at.
 */
async function priceOrderLines(
  client: Prisma.TransactionClient,
  venueId: string,
  lines: OrderLineInput[]
): Promise<{ total: number; rows: PricedLine[] }> {
  const ids = [...new Set(lines.map((l) => l.itemId).filter((v): v is string => typeof v === "string"))];
  const records = ids.length
    ? await client.menuItem.findMany({ where: { id: { in: ids }, venueId }, include: ITEM_INCLUDE })
    : [];
  const byId = new Map(records.map((r) => [r.id, mapItem(r)]));

  let total = 0;
  const rows: PricedLine[] = [];

  for (const line of lines) {
    const item = byId.get(line.itemId);
    if (!item || !item.available) continue;
    const qty = normalizeQty(line.qty);
    const { unitMinor, choiceNames } = priceLine(item, line.choiceIds ?? []);
    total += unitMinor * qty;
    rows.push({
      itemId: item.id,
      nameSnap: item.nameJson,
      qty,
      unitPriceMinor: unitMinor,
      choicesSnap: choiceNames.length ? JSON.stringify(choiceNames) : "",
    });
  }

  return { total, rows };
}

async function writeOrder(
  client: Prisma.TransactionClient,
  venueId: string,
  tableId: string,
  priced: { total: number; rows: PricedLine[] },
  note?: string
): Promise<OrderRow> {
  if (priced.rows.length === 0) throw new Error("empty_order");
  // A nested create writes the order and its lines together.
  const order = await client.order.create({
    data: {
      venueId,
      tableId,
      status: "new",
      totalMinor: priced.total,
      note: note ?? null,
      paid: false,
      items: { create: priced.rows },
    },
    include: ORDER_INCLUDE,
  });
  return mapOrder(order);
}

/* ---------------- shared table cart ---------------- */

export type CartLineRow = {
  id: string;
  itemId: string;
  nameJson: string;
  qty: number;
  unitMinor: number;
  choiceIds: string[];
  choiceNames: string[];
  addedAt: number;
};

const CART_INCLUDE = Prisma.validator<Prisma.CartLineInclude>()({ item: { include: ITEM_INCLUDE } });
type CartRecord = Prisma.CartLineGetPayload<{ include: typeof CART_INCLUDE }>;

/** One table may not hoard the database with an endless draft. */
const MAX_CART_LINES = 40;

function mapCartLine(r: CartRecord): CartLineRow {
  const item = mapItem(r.item);
  const choiceIds = unpackChoiceIds(r.choiceIds);
  const { unitMinor, choiceNames } = priceLine(item, choiceIds);
  return {
    id: r.id,
    itemId: item.id,
    nameJson: item.nameJson,
    qty: r.qty,
    unitMinor,
    choiceIds,
    choiceNames,
    addedAt: r.createdAt.getTime(),
  };
}

/**
 * The table's shared draft, oldest line first. Prices are recomputed from the
 * menu on every read, so a price change mid-meal cannot be locked in by
 * leaving a phone open on the cart screen.
 */
export async function listTableCart(venueId: string, tableId: string): Promise<CartLineRow[]> {
  const rows = await prisma.cartLine.findMany({
    where: { venueId, tableId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: CART_INCLUDE,
  });
  // An item pulled from the menu mid-meal disappears from the draft as well.
  return rows.filter((r) => r.item.available).map(mapCartLine);
}

export async function addCartLine(
  venueId: string,
  tableId: string,
  input: OrderLineInput
): Promise<CartLineRow[]> {
  const record = await prisma.menuItem.findFirst({
    where: { id: input.itemId, venueId, available: true },
    include: ITEM_INCLUDE,
  });
  if (!record) throw new Error("item_not_found");
  if ((await prisma.cartLine.count({ where: { venueId, tableId } })) >= MAX_CART_LINES) {
    throw new Error("cart_full");
  }

  // Only choices that belong to this item are stored.
  const item = mapItem(record);
  const known = new Set(item.optionGroups.flatMap((g) => g.choices.map((c) => c.id)));
  const choiceIds = (input.choiceIds ?? []).filter((id) => known.has(id));

  await prisma.cartLine.create({
    data: {
      venueId,
      tableId,
      itemId: item.id,
      qty: normalizeQty(input.qty),
      choiceIds: packChoiceIds(choiceIds),
    },
  });
  return listTableCart(venueId, tableId);
}

/** Set a line's quantity. Zero or less removes it. Scoped to the table so one
 * table's QR can never touch another table's draft. */
export async function setCartLineQty(
  venueId: string,
  tableId: string,
  lineId: string,
  qty: number
): Promise<CartLineRow[]> {
  if (qty <= 0) {
    await prisma.cartLine.deleteMany({ where: { id: lineId, venueId, tableId } });
  } else {
    await prisma.cartLine.updateMany({
      where: { id: lineId, venueId, tableId },
      data: { qty: normalizeQty(qty) },
    });
  }
  return listTableCart(venueId, tableId);
}

export async function clearTableCart(venueId: string, tableId: string): Promise<void> {
  await prisma.cartLine.deleteMany({ where: { venueId, tableId } });
}

/**
 * Turn the table's shared cart into one order. The draft rows are claimed
 * inside the transaction, so two phones pressing send at the same moment
 * cannot order the same food twice: the loser finds the cart already empty.
 */
export async function placeTableOrder(venueId: string, tableId: string, note?: string): Promise<OrderRow> {
  return prisma.$transaction(async (tx) => {
    const lines = await tx.cartLine.findMany({
      where: { venueId, tableId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    if (lines.length === 0) throw new Error("empty_order");

    const claimed = await tx.cartLine.deleteMany({ where: { id: { in: lines.map((l) => l.id) } } });
    if (claimed.count !== lines.length) throw new Error("empty_order");

    const priced = await priceOrderLines(
      tx,
      venueId,
      lines.map((l) => ({ itemId: l.itemId, qty: l.qty, choiceIds: unpackChoiceIds(l.choiceIds) }))
    );
    return writeOrder(tx, venueId, tableId, priced, note);
  });
}

export async function getOrder(id: string, venueId: string): Promise<OrderRow | null> {
  const r = await prisma.order.findFirst({ where: { id, venueId }, include: ORDER_INCLUDE });
  return r ? mapOrder(r) : null;
}

export async function listTableOrders(venueId: string, tableId: string): Promise<OrderRow[]> {
  const rows = await prisma.order.findMany({
    where: { venueId, tableId, createdAt: { gt: since8h() } },
    orderBy: { createdAt: "desc" },
    take: 12,
    include: ORDER_INCLUDE,
  });
  return rows.map(mapOrder);
}

export async function listActiveOrders(venueId: string): Promise<OrderRow[]> {
  const rows = await prisma.order.findMany({
    where: {
      venueId,
      OR: [{ status: { in: ["new", "in_progress"] } }, { createdAt: { gt: since8h() } }],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: ORDER_INCLUDE,
  });
  return rows.map(mapOrder);
}

export async function setOrderStatus(id: string, venueId: string, status: string): Promise<OrderRow | null> {
  await prisma.order.updateMany({ where: { id, venueId }, data: { status } });
  return getOrder(id, venueId);
}

export async function unpaidOrdersForTable(venueId: string, tableId: string): Promise<OrderRow[]> {
  const rows = await prisma.order.findMany({
    where: { venueId, tableId, paid: false, status: { not: "cancelled" } },
    include: ORDER_INCLUDE,
  });
  return rows.map(mapOrder);
}

export async function markOrdersPaid(orderIds: string[]) {
  if (!orderIds.length) return;
  await prisma.order.updateMany({ where: { id: { in: orderIds } }, data: { paid: true } });
}

/* ---------------- payments ---------------- */

function mapPayment(r: PaymentRecord): PaymentRow {
  return {
    id: r.id, venueId: r.venueId, tableNumber: r.tableNumber, orderIds: r.orderIds,
    amountMinor: r.amountMinor, provider: r.provider, status: r.status,
    providerRef: r.providerRef,
    createdAt: r.createdAt.getTime(),
    paidAt: r.paidAt ? r.paidAt.getTime() : null,
  };
}

export async function createPayment(
  venueId: string,
  tableNumber: number | null,
  orderIds: string[],
  amountMinor: number,
  provider: string
): Promise<PaymentRow> {
  const row = await prisma.payment.create({
    data: { venueId, tableNumber, orderIds: orderIds.join(","), amountMinor, provider, status: "pending" },
  });
  return mapPayment(row);
}

export async function getPayment(id: string): Promise<PaymentRow | null> {
  const r = await prisma.payment.findUnique({ where: { id } });
  return r ? mapPayment(r) : null;
}

export async function setPaymentRef(id: string, providerRef: string) {
  await prisma.payment.updateMany({ where: { id }, data: { providerRef } });
}

export async function setPaymentStatus(id: string, status: "paid" | "failed"): Promise<PaymentRow | null> {
  await prisma.payment.updateMany({
    where: { id },
    data: { status, paidAt: status === "paid" ? new Date() : null },
  });
  return getPayment(id);
}

export async function listRecentPayments(venueId: string): Promise<PaymentRow[]> {
  const rows = await prisma.payment.findMany({
    where: { venueId, createdAt: { gt: since8h() } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return rows.map(mapPayment);
}

/* ---------------- analytics ---------------- */

export async function recordScan(venueId: string, tableId: string | null, lang: string | null) {
  await prisma.scanEvent.create({ data: { venueId, tableId, lang } });
}

const pad2 = (v: number) => String(v).padStart(2, "0");
/** Local calendar day, matching what SQLite's `date(..., 'localtime')` used to produce. */
const localDay = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export async function analytics(venueId: string) {
  const dayMs = 86400000;
  const nowMs = Date.now();
  const startToday = new Date(new Date().setHours(0, 0, 0, 0));
  const weekAgo = new Date(nowMs - 7 * dayMs);
  const twoWeeksAgo = new Date(nowMs - 14 * dayMs);
  const monthAgo = new Date(nowMs - 30 * dayMs);

  const [scanTotal, scanToday, scanWeek, scansByTable, tables, recentScans, requestsWeek, ordersWeek, revenue] =
    await Promise.all([
      prisma.scanEvent.count({ where: { venueId } }),
      prisma.scanEvent.count({ where: { venueId, createdAt: { gte: startToday } } }),
      prisma.scanEvent.count({ where: { venueId, createdAt: { gte: weekAgo } } }),
      prisma.scanEvent.groupBy({
        by: ["tableId"],
        where: { venueId, createdAt: { gte: monthAgo } },
        _count: { _all: true },
      }),
      prisma.table.findMany({ where: { venueId }, select: { id: true, number: true } }),
      prisma.scanEvent.findMany({
        where: { venueId, createdAt: { gte: twoWeeksAgo } },
        select: { createdAt: true },
      }),
      prisma.request.count({ where: { venueId, createdAt: { gte: weekAgo } } }),
      prisma.order.count({ where: { venueId, createdAt: { gte: weekAgo } } }),
      prisma.payment.aggregate({
        where: { venueId, status: "paid", createdAt: { gte: weekAgo } },
        _sum: { amountMinor: true },
      }),
    ]);

  const numberById = new Map(tables.map((t) => [t.id, t.number]));
  const byTable = scansByTable
    .map((g) => ({
      tableNumber: g.tableId != null ? numberById.get(g.tableId) ?? null : null,
      scans: g._count._all,
    }))
    .sort((a, b) => b.scans - a.scans);

  const perDay = new Map<string, number>();
  for (const s of recentScans) {
    const day = localDay(s.createdAt);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }
  const byDay = [...perDay.entries()]
    .map(([day, scans]) => ({ day, scans }))
    .sort((a, b) => a.day.localeCompare(b.day));

  return {
    scanTotal, scanToday, scanWeek,
    byTable, byDay,
    requestsWeek, ordersWeek,
    revenueWeek: revenue._sum.amountMinor ?? 0,
  };
}
