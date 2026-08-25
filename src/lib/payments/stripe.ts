import type { PaymentProvider } from "./index";

/**
 * Stripe adapter, SKELETON (v0.2 roadmap).
 *
 * To implement:
 *  1. `npm install stripe`
 *  2. Set STRIPE_SECRET_KEY in .env
 *  3. createCheckout → stripe.checkout.sessions.create({ line_items, success_url: returnUrl })
 *  4. confirm → verify via webhook (checkout.session.completed) or session retrieve
 *
 * Until configured, this provider refuses to create checkouts so venues can't
 * accidentally enable a non-functional payment flow.
 */
export const stripeProvider: PaymentProvider = {
  name: "stripe",
  async createCheckout() {
    throw new Error("Stripe is not configured yet. Set STRIPE_SECRET_KEY and implement src/lib/payments/stripe.ts (see roadmap v0.2).");
  },
  async confirm() {
    return { ok: false };
  },
};
