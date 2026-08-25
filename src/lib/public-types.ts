/** Types shared between server and client components. No server imports here. */

export type PublicChoice = {
  id: string;
  nameJson: string;
  priceDelta: number;
  priceAbsolute: number | null;
};

export type PublicGroup = {
  id: string;
  nameJson: string;
  type: string; // single | multi
  required: boolean;
  choices: PublicChoice[];
};

export type PublicItem = {
  id: string;
  nameJson: string;
  descJson: string;
  priceMinor: number;
  emoji: string | null;
  imageUrl: string | null;
  prepMinutes: number | null;
  tags: string[];
  available: boolean;
  optionGroups: PublicGroup[];
};

export type PublicCategory = {
  id: string;
  nameJson: string;
  items: PublicItem[];
  children: PublicCategory[];
};

export type PublicVenue = {
  id: string;
  slug: string;
  name: string;
  welcomeJson: string;
  currency: string;
  languages: string[];
  defaultLang: string;
  themePrimary: string;
  themeMode: string;
  featureWaiter: boolean;
  featureBill: boolean;
  featureOrdering: boolean;
  featurePayments: boolean;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  hours: string | null;
};

export type MenuPayload = {
  venue: PublicVenue;
  categories: PublicCategory[];
  tableNumber: number | null;
};
