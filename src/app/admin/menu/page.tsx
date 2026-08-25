import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listCategories, listItems } from "@/lib/repo";
import MenuEditor from "./menu-editor";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");

  const [categories, items] = await Promise.all([
    listCategories(user.venueId),
    listItems(user.venueId),
  ]);

  return (
    <MenuEditor
      initialCategories={categories}
      initialItems={items}
      languages={user.venue.languages.split(",").filter(Boolean)}
      currency={user.venue.currency}
      defaultLang={user.venue.defaultLang}
    />
  );
}
