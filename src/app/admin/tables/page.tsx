import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listTables } from "@/lib/repo";
import TablesClient from "./tables-client";

export const dynamic = "force-dynamic";

export default async function TablesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");

  return <TablesClient initialTables={await listTables(user.venueId)} slug={user.venue.slug} />;
}
