import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listActiveOrders, listActiveRequests, listRecentPayments } from "@/lib/repo";
import LivePanel from "./live-panel";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");

  const [requests, orders, payments] = await Promise.all([
    listActiveRequests(user.venueId),
    listActiveOrders(user.venueId),
    listRecentPayments(user.venueId),
  ]);

  return (
    <LivePanel
      initialRequests={requests}
      initialOrders={orders}
      initialPayments={payments}
      currency={user.venue.currency}
      defaultLang={user.venue.defaultLang}
    />
  );
}
