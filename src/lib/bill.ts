/**
 * Table bill arithmetic.
 *
 * A table pays in whatever shape suits it: all at once, an even share each, or
 * a figure someone types in. That means a payment rarely matches an order, so
 * the bill is settled by amount and an order only counts as paid once its own
 * total is covered.
 *
 * Kept pure and free of server imports so the guest screen and the payment
 * writer agree on every kuruş.
 */

export type Settleable = { totalMinor: number; paidMinor: number; status?: string };

export type TableBill = {
  totalMinor: number;
  paidMinor: number;
  remainingMinor: number;
};

/** What the table owes. Cancelled orders are not part of anyone's bill. */
export function summarizeBill(orders: readonly Settleable[]): TableBill {
  const billable = orders.filter((o) => o.status !== "cancelled");
  const totalMinor = billable.reduce((sum, o) => sum + o.totalMinor, 0);
  // An overpaid order must not subsidise the next one, hence the clamp.
  const paidMinor = billable.reduce((sum, o) => sum + Math.min(o.paidMinor, o.totalMinor), 0);
  return { totalMinor, paidMinor, remainingMinor: Math.max(0, totalMinor - paidMinor) };
}

export type Allocation<T> = { order: T; paidMinor: number; paid: boolean };

/**
 * Spread a settled amount over outstanding orders in the order given, which
 * the caller sorts oldest first. Returns only the orders that changed, plus
 * how much of the payment actually landed on the bill: any remainder means the
 * table was settled while this payment was in flight.
 */
export function allocatePayment<T extends Settleable>(
  orders: readonly T[],
  amountMinor: number
): { allocations: Allocation<T>[]; applied: number } {
  const allocations: Allocation<T>[] = [];
  let left = Math.max(0, amountMinor);

  for (const order of orders) {
    if (left <= 0) break;
    const due = order.totalMinor - order.paidMinor;
    if (due <= 0) continue;
    const take = Math.min(due, left);
    left -= take;
    const settled = order.paidMinor + take;
    allocations.push({ order, paidMinor: settled, paid: settled >= order.totalMinor });
  }

  return { allocations, applied: Math.max(0, amountMinor) - left };
}

/**
 * An even share of what is left. Rounded up so a share never leaves a stray
 * kuruş behind, and never more than the whole remaining bill.
 */
export function evenShare(remainingMinor: number, people: number): number {
  if (remainingMinor <= 0 || people < 1) return 0;
  return Math.min(Math.ceil(remainingMinor / people), remainingMinor);
}
