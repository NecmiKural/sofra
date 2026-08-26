/** Self-check for split bill arithmetic: npm run check:bill */
import assert from "node:assert/strict";
import { allocatePayment, evenShare, summarizeBill } from "../src/lib/bill";

const order = (totalMinor: number, paidMinor = 0, status = "new") => ({ totalMinor, paidMinor, status });

/* ---- what the table owes ---- */

assert.deepEqual(summarizeBill([]), { totalMinor: 0, paidMinor: 0, remainingMinor: 0 });
assert.deepEqual(summarizeBill([order(10000), order(5000)]), {
  totalMinor: 15000,
  paidMinor: 0,
  remainingMinor: 15000,
});
assert.equal(
  summarizeBill([order(10000), order(5000, 0, "cancelled")]).remainingMinor,
  10000,
  "a cancelled order is on nobody's bill"
);
assert.equal(
  summarizeBill([order(10000, 4000)]).remainingMinor,
  6000,
  "a part paid order still owes the rest"
);
assert.equal(
  summarizeBill([order(10000, 15000), order(5000)]).remainingMinor,
  5000,
  "overpaying one order does not settle the next"
);

/* ---- spreading a payment ---- */

const bill = [order(10000), order(6000)];

const share = allocatePayment(bill, 4000);
assert.equal(share.applied, 4000, "a small share is fully applied");
assert.equal(share.allocations.length, 1, "it only touches the order it reaches");
assert.equal(share.allocations[0].paidMinor, 4000);
assert.equal(share.allocations[0].paid, false, "part payment does not close an order");

const spill = allocatePayment(bill, 13000);
assert.deepEqual(
  spill.allocations.map((a) => [a.paidMinor, a.paid]),
  [
    [10000, true],
    [3000, false],
  ],
  "a payment flows into the next order once the first is covered"
);

const whole = allocatePayment(bill, 16000);
assert.equal(whole.applied, 16000);
assert.ok(whole.allocations.every((a) => a.paid), "paying the lot closes every order");

const late = allocatePayment([order(10000, 10000)], 5000);
assert.equal(late.applied, 0, "a payment landing on a settled table applies nothing");
assert.deepEqual(late.allocations, [], "and changes no orders");

assert.equal(allocatePayment(bill, 0).applied, 0, "zero is a no-op");
assert.equal(allocatePayment(bill, -500).applied, 0, "a negative amount cannot credit the table");

/* ---- even shares terminate ---- */

assert.equal(evenShare(15000, 3), 5000, "an even split divides exactly");
assert.equal(evenShare(10000, 3), 3334, "an uneven split rounds up so nothing is left behind");
assert.equal(evenShare(100, 8), 13, "rounding up survives tiny remainders");
assert.equal(evenShare(3000, 5), 600);
assert.equal(evenShare(0, 4), 0, "a settled table asks for nothing");
assert.equal(evenShare(5000, 0), 0, "zero people cannot divide by zero");
assert.equal(evenShare(1000, 3), 334, "a share never exceeds what is owed once capped");
assert.ok(evenShare(1000, 1) === 1000, "one person pays the lot");

// Three people paying ceil(bill/3) in turn must settle the table exactly.
let remaining = 10000;
for (let paid = 0; paid < 3 && remaining > 0; paid++) {
  remaining -= evenShare(remaining, 3 - paid);
}
assert.equal(remaining, 0, "a split settles to zero rather than leaving a crumb");

console.log("bill checks passed");
