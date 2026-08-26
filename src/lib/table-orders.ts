/**
 * Kitchen grouping for guest orders.
 *
 * Everyone at a table orders from their own phone, so one table produces one
 * order row per person. Left ungrouped the kitchen sees them as unrelated
 * tickets and another table's order can slot in between, which is how one
 * guest's food arrives well before their friend's. Grouping by table keeps a
 * table's tickets on screen together and in arrival order.
 */

export type GroupableOrder = {
  id: string;
  tableNumber: number | null;
  totalMinor: number;
  createdAt: number;
};

export type OrderGroup<T extends GroupableOrder> = {
  key: string;
  tableNumber: number | null;
  orders: T[];
  totalMinor: number;
  /** Timestamp of the group's first ticket. Drives kitchen priority. */
  oldest: number;
};

/**
 * Group orders by table, oldest table first, tickets within a table in the
 * order they were placed. Orders without a table cannot be merged safely, so
 * each one stays in a group of its own.
 */
export function groupOrdersByTable<T extends GroupableOrder>(orders: readonly T[]): OrderGroup<T>[] {
  const groups = new Map<string, OrderGroup<T>>();

  for (const order of orders) {
    const key = order.tableNumber == null ? `solo:${order.id}` : `table:${order.tableNumber}`;
    const existing = groups.get(key);
    groups.set(
      key,
      existing
        ? {
            ...existing,
            orders: [...existing.orders, order],
            totalMinor: existing.totalMinor + order.totalMinor,
            oldest: Math.min(existing.oldest, order.createdAt),
          }
        : {
            key,
            tableNumber: order.tableNumber,
            orders: [order],
            totalMinor: order.totalMinor,
            oldest: order.createdAt,
          }
    );
  }

  return [...groups.values()]
    .map((group) => ({ ...group, orders: [...group.orders].sort((a, b) => a.createdAt - b.createdAt) }))
    .sort((a, b) => a.oldest - b.oldest);
}
