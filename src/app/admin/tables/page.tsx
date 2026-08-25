import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { withTableTokens } from "@/lib/guest";
import { listTables } from "@/lib/repo";
import TablesClient from "./tables-client";

export const dynamic = "force-dynamic";

export default async function TablesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");

  const tables = withTableTokens(user.venue.slug, await listTables(user.venueId));
  return <TablesClient initialTables={tables} slug={user.venue.slug} />;
}
