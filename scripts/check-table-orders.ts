/** Self-check for kitchen table grouping: npm run check:tables */
import assert from "node:assert/strict";
import { groupOrdersByTable } from "../src/lib/table-orders";

const order = (id: string, tableNumber: number | null, createdAt: number, totalMinor = 1000) => ({
  id,
  tableNumber,
  createdAt,
  totalMinor,
});

// Two phones at table 5 and one at table 9, interleaved in time.
const groups = groupOrdersByTable([
  order("b", 5, 200),
  order("c", 9, 150),
  order("a", 5, 100),
]);

assert.equal(groups.length, 2, "one group per table");
assert.deepEqual(
  groups.map((g) => g.tableNumber),
  [5, 9],
  "the table that ordered first is served first"
);
assert.deepEqual(
  groups[0].orders.map((o) => o.id),
  ["a", "b"],
  "a table's tickets stay in the order they were placed"
);
assert.equal(groups[0].totalMinor, 2000, "group total sums the table's tickets");
assert.equal(groups[0].oldest, 100, "group priority comes from the first ticket");

// Orders with no table cannot be merged: two unknown tables are not one party.
const solo = groupOrdersByTable([order("x", null, 10), order("y", null, 20)]);
assert.equal(solo.length, 2, "table-less orders each stay on their own");

assert.deepEqual(groupOrdersByTable([]), [], "no orders means no groups");

const input = [order("a", 5, 100), order("b", 5, 200)];
const snapshot = JSON.stringify(input);
groupOrdersByTable(input);
assert.equal(JSON.stringify(input), snapshot, "grouping does not mutate its input");

console.log("table grouping checks passed");
