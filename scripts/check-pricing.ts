/** Self-check for shared line pricing: npm run check:pricing */
import assert from "node:assert/strict";
import { MAX_LINE_QTY, normalizeQty, packChoiceIds, priceLine, unpackChoiceIds } from "../src/lib/pricing";

const item = {
  priceMinor: 10000,
  optionGroups: [
    {
      choices: [
        { id: "extra", nameJson: '{"tr":"Ekstra peynir"}', priceDelta: 1500, priceAbsolute: null },
        { id: "sauce", nameJson: '{"tr":"Sos"}', priceDelta: 500, priceAbsolute: null },
        { id: "large", nameJson: '{"tr":"Büyük boy"}', priceDelta: 0, priceAbsolute: 18000 },
      ],
    },
  ],
};

assert.equal(priceLine(item, []).unitMinor, 10000, "no choices means the base price");
assert.equal(priceLine(item, ["extra"]).unitMinor, 11500, "a delta choice adds to the base");
assert.equal(priceLine(item, ["extra", "sauce"]).unitMinor, 12000, "deltas stack");
assert.equal(priceLine(item, ["large"]).unitMinor, 18000, "an absolute choice replaces the base");
assert.equal(priceLine(item, ["large", "extra"]).unitMinor, 19500, "deltas still apply on top of an absolute");
assert.equal(priceLine(item, ["nope"]).unitMinor, 10000, "unknown choice ids are ignored");
assert.deepEqual(
  priceLine(item, ["sauce", "extra"]).choiceNames.map((n) => JSON.parse(n).tr),
  ["Ekstra peynir", "Sos"],
  "choice names come back in menu order, not in the order they were sent"
);

assert.equal(normalizeQty(0), 1, "zero falls back to one");
assert.equal(normalizeQty(-5), 1, "negatives cannot underflow a line");
assert.equal(normalizeQty(2.6), 3, "fractional quantities round");
assert.equal(normalizeQty(9999), MAX_LINE_QTY, "quantities are capped");
assert.equal(normalizeQty(NaN), 1, "garbage falls back to one");

assert.equal(packChoiceIds([]), "", "an empty selection packs to an empty string");
assert.deepEqual(unpackChoiceIds(""), [], "an empty string unpacks to no choices");
assert.deepEqual(unpackChoiceIds(packChoiceIds(["a", "b"])), ["a", "b"], "packing round-trips");

console.log("pricing checks passed");
