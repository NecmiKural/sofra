import { getVenueBySlug, listCategories, listItems, type Item, type Venue } from "./repo";
import type { MenuPayload, PublicCategory, PublicItem, PublicVenue } from "./public-types";

export type { MenuPayload, PublicCategory, PublicItem, PublicVenue } from "./public-types";

function toPublicItem(it: Item): PublicItem {
  return {
    id: it.id,
    nameJson: it.nameJson,
    descJson: it.descJson,
    priceMinor: it.priceMinor,
    emoji: it.emoji,
    imageUrl: it.imageUrl,
    prepMinutes: it.prepMinutes,
    tags: it.tags ? it.tags.split(",").filter(Boolean) : [],
    available: it.available,
    optionGroups: it.optionGroups.map((g) => ({
      id: g.id,
      nameJson: g.nameJson,
      type: g.type,
      required: g.required,
      choices: g.choices.map((c) => ({
        id: c.id,
        nameJson: c.nameJson,
        priceDelta: c.priceDelta,
        priceAbsolute: c.priceAbsolute,
      })),
    })),
  };
}

function toPublicVenue(v: Venue): PublicVenue {
  return {
    id: v.id,
    slug: v.slug,
    name: v.name,
    welcomeJson: v.welcomeJson,
    currency: v.currency,
    languages: v.languages.split(",").filter(Boolean),
    defaultLang: v.defaultLang,
    themePrimary: v.themePrimary,
    themeMode: v.themeMode,
    featureWaiter: v.featureWaiter,
    featureBill: v.featureBill,
    featureOrdering: v.featureOrdering,
    featurePayments: v.featurePayments,
    phone: v.phone,
    whatsapp: v.whatsapp,
    instagram: v.instagram,
    hours: v.hours,
  };
}

export async function buildMenuPayload(slug: string, tableNumber: number | null): Promise<MenuPayload | null> {
  const venue = await getVenueBySlug(slug);
  if (!venue) return null;

  const [categories, items] = await Promise.all([listCategories(venue.id), listItems(venue.id)]);
  const itemsByCat = new Map<string, PublicItem[]>();
  for (const raw of items) {
    if (!itemsByCat.has(raw.categoryId)) itemsByCat.set(raw.categoryId, []);
    itemsByCat.get(raw.categoryId)!.push(toPublicItem(raw));
  }

  const buildTree = (parentId: string | null): PublicCategory[] =>
    categories
      .filter((c) => c.parentId === parentId)
      .map((c) => ({
        id: c.id,
        nameJson: c.nameJson,
        items: itemsByCat.get(c.id) ?? [],
        children: buildTree(c.id),
      }));

  return { venue: toPublicVenue(venue), categories: buildTree(null), tableNumber };
}
