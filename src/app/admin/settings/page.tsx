import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import SettingsForm from "./settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");

  return <SettingsForm venue={user.venue} />;
}
