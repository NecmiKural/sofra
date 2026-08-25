import { notFound } from "next/navigation";
import { buildMenuPayload } from "@/lib/menu-data";
import { getTableByNumber, recordScan } from "@/lib/repo";
import GuestMenu from "./menu-client";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table?: string; lang?: string }>;
};

export default async function MenuPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const tableNumber = sp.table ? parseInt(sp.table, 10) || null : null;

  const payload = await buildMenuPayload(slug, tableNumber);
  if (!payload) notFound();

  const lang =
    sp.lang && payload.venue.languages.includes(sp.lang)
      ? sp.lang
      : payload.venue.defaultLang;

  // Scan analytics — must never break the menu.
  try {
    const table = tableNumber != null ? await getTableByNumber(payload.venue.id, tableNumber) : null;
    await recordScan(payload.venue.id, table?.id ?? null, lang);
  } catch {}

  return <GuestMenu payload={payload} initialLang={lang} />;
}
