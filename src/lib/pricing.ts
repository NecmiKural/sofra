/**
 * One place where a menu line turns into money. The guest cart, the shared
 * table cart and the order writer all price the same way, so a line can never
 * cost one thing on screen and another in the kitchen.
 *
 * No server imports here: the client bundles this too.
 */

export type PriceableChoice = { id: string; nameJson: string; priceDelta: number; priceAbsolute: number | null };
export type PriceableItem = {
  priceMinor: number;
  optionGroups: { choices: PriceableChoice[] }[];
};

export const MAX_LINE_QTY = 50;

/** Clamp a client-supplied quantity into something a kitchen can serve. */
export function normalizeQty(qty: number): number {
  return Math.max(1, Math.min(MAX_LINE_QTY, Math.round(qty || 1)));
}

/**
 * Unit price for one line, plus the chosen option names in menu order.
 * A choice with `priceAbsolute` replaces the base price; the rest add up.
 */
export function priceLine(
  item: PriceableItem,
  choiceIds: readonly string[]
): { unitMinor: number; choiceNames: string[] } {
  let base = item.priceMinor;
  let delta = 0;
  const choiceNames: string[] = [];

  for (const group of item.optionGroups) {
    for (const choice of group.choices) {
      if (!choiceIds.includes(choice.id)) continue;
      choiceNames.push(choice.nameJson);
      if (choice.priceAbsolute != null) base = choice.priceAbsolute;
      else delta += choice.priceDelta;
    }
  }

  return { unitMinor: base + delta, choiceNames };
}

/** Option ids travel through the database as a comma separated string. */
export function packChoiceIds(ids: readonly string[]): string {
  return ids.join(",");
}

export function unpackChoiceIds(packed: string): string[] {
  return packed ? packed.split(",").filter(Boolean) : [];
}
