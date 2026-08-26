/** Self-check for guest QR tokens and rate limiting: npm run check:guest */
import assert from "node:assert/strict";
import { guestGate, rateLimit, tableToken, verifyTableToken, withTableTokens } from "../src/lib/guest";

const slug = "cafe-sofra";
const token = tableToken(slug, 7);

assert.equal(tableToken(slug, 7), token, "tokens are deterministic");
assert.ok(verifyTableToken(slug, 7, token));
assert.ok(!verifyTableToken(slug, 8, token), "token is bound to its table");
assert.ok(!verifyTableToken("other-venue", 7, token), "token is bound to its venue");
assert.ok(!verifyTableToken(slug, 7, null), "missing token is rejected");
assert.ok(!verifyTableToken(slug, 7, "short"), "wrong length is rejected without throwing");
assert.ok(!verifyTableToken(slug, 7, "ü".repeat(16)), "multibyte input is rejected without throwing");
assert.ok(!verifyTableToken(slug, 7.5, tableToken(slug, 7.5)), "non-integer tables are rejected");

assert.deepEqual(withTableTokens(slug, [{ number: 7 }]), [{ number: 7, token }]);

for (let i = 0; i < 3; i++) assert.ok(rateLimit("k", 3), `call ${i} within limit`);
assert.ok(!rateLimit("k", 3), "fourth call over a limit of 3 is blocked");
assert.ok(rateLimit("other-key", 3), "buckets are independent");

const req = new Request("http://x/api/requests", { headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" } });
assert.equal(guestGate(req, slug, 7, token, 2, "order"), null, "valid token passes");
assert.equal(guestGate(req, slug, 7, token, 2, "order"), null);
assert.equal(guestGate(req, slug, 7, token, 2, "order")?.status, 429, "third call is rate limited");
assert.equal(guestGate(req, slug, 9, tableToken(slug, 9), 2, "order"), null, "a different table has its own bucket");
assert.equal(
  guestGate(req, slug, 7, token, 2, "cart"),
  null,
  "a busy shared cart must not spend the table's ordering budget"
);
assert.equal(guestGate(req, slug, 7, "deadbeefdeadbeef", 2, "order")?.status, 403, "forged token is rejected");

console.log("guest token + rate limit checks passed");
