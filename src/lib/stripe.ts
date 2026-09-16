import Stripe from "stripe";

// One client per call rather than a module-level singleton - this app's
// Stripe key can change at runtime via the Settings page (same as every
// other credential here), so there's no fixed key to cache a client
// against.
function client(secretKey: string): Stripe {
  return new Stripe(secretKey);
}

// Card captured (not charged) when a guest submits an upgrade request -
// creates a Customer to attach the payment method to, then a SetupIntent
// whose client_secret the guest-facing Stripe Elements form needs to
// actually collect and confirm the card.
export async function createSetupIntent(
  secretKey: string,
  input: { email?: string | null; description: string }
): Promise<{ customerId: string; setupIntentId: string; clientSecret: string }> {
  const stripe = client(secretKey);

  const customer = await stripe.customers.create({
    email: input.email ?? undefined,
    description: input.description,
  });

  const setupIntent = await stripe.setupIntents.create({
    customer: customer.id,
    automatic_payment_methods: { enabled: true },
  });

  if (!setupIntent.client_secret) {
    throw new Error("Stripe did not return a client secret for the SetupIntent.");
  }

  return { customerId: customer.id, setupIntentId: setupIntent.id, clientSecret: setupIntent.client_secret };
}

export type ChargeResult =
  | { succeeded: true; paymentIntentId: string }
  | { succeeded: false; paymentIntentId: string | null; error: string };

// Approval fires this off-session (the guest isn't present) - a decline
// here is an expected outcome, not a bug, so this never throws on one;
// callers branch on `succeeded`.
export async function chargeOffSession(
  secretKey: string,
  input: { customerId: string; paymentMethodId: string; amountCents: number; description: string }
): Promise<ChargeResult> {
  const stripe = client(secretKey);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: input.amountCents,
      currency: "usd",
      customer: input.customerId,
      payment_method: input.paymentMethodId,
      off_session: true,
      confirm: true,
      description: input.description,
    });
    if (paymentIntent.status === "succeeded") {
      return { succeeded: true, paymentIntentId: paymentIntent.id };
    }
    return {
      succeeded: false,
      paymentIntentId: paymentIntent.id,
      error: `Payment status: ${paymentIntent.status}`,
    };
  } catch (error) {
    if (error instanceof Stripe.errors.StripeCardError) {
      const paymentIntentId =
        error.payment_intent && typeof error.payment_intent === "object" ? error.payment_intent.id : null;
      return { succeeded: false, paymentIntentId, error: error.message };
    }
    return {
      succeeded: false,
      paymentIntentId: null,
      error: error instanceof Error ? error.message : "Stripe charge failed.",
    };
  }
}
