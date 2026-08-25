import { guard, json } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { listActiveOrders, listActiveRequests, listRecentPayments } from "@/lib/repo";

/** Initial state for the staff live panel. */
export async function GET() {
  return guard(async () => {
    const user = await requireUser();
    const [requests, orders, payments] = await Promise.all([
      listActiveRequests(user.venueId),
      listActiveOrders(user.venueId),
      listRecentPayments(user.venueId),
    ]);
    return json({ requests, orders, payments });
  });
}
