import type { PaymentProvider } from "./index";

/**
 * Mock provider: sends the guest to Sofra's own /pay/[id] page where a
 * "Pay now" button confirms instantly. Perfect for demos and development.
 */
export const mockProvider: PaymentProvider = {
  name: "mock",
  async createCheckout(input) {
    const ret = encodeURIComponent(input.returnUrl);
    return { checkoutUrl: `/pay/${input.paymentId}?return=${ret}`, providerRef: `mock_${input.paymentId}` };
  },
  async confirm() {
    return { ok: true };
  },
};
