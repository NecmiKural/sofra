/**
 * Payment provider abstraction.
 *
 * Sofra treats payments as "table bills": the open (unpaid) orders of a table are
 * summed into a single Payment. Providers only need to know how to create a
 * checkout for an amount and how to confirm it.
 *
 * v0.1 ships a `mock` provider (instant success, for demos and development).
 * Real adapters (Stripe, iyzico) implement the same interface. See stripe.ts.
 */

export interface CreatePaymentInput {
  paymentId: string;
  amountMinor: number;
  currency: string;
  description: string;
  returnUrl: string;
}

export interface PaymentProvider {
  name: string;
  /** Returns the URL the guest should be redirected to. */
  createCheckout(input: CreatePaymentInput): Promise<{ checkoutUrl: string; providerRef?: string }>;
  /** Confirms/captures the payment. Mock succeeds instantly. */
  confirm(paymentId: string, providerRef?: string | null): Promise<{ ok: boolean }>;
}

import { mockProvider } from "./mock";
import { stripeProvider } from "./stripe";

const providers: Record<string, PaymentProvider> = {
  mock: mockProvider,
  stripe: stripeProvider,
};

export function getProvider(name: string): PaymentProvider {
  return providers[name] ?? mockProvider;
}
