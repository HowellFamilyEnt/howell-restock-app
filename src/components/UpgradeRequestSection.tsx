"use client";

import { useRef, useState } from "react";
import { loadStripe, type Stripe, type StripeElements } from "@stripe/stripe-js";
import { startUpgradeRequest, finalizeUpgradeRequestPayment } from "@/lib/upgradeRequest";

type Tier = { key: string; label: string; priceCents: number };

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

// One instance per category (Early Check-In / Late Check-Out / Add-ons),
// rendered on the real guest portal only - never in /guest-preview, which
// must never be able to trigger a real Stripe charge. Two-step flow: (1)
// pick a tier and submit -> server creates the UpgradeRequest + a Stripe
// SetupIntent, returns its client_secret; (2) mount Stripe Elements with
// that secret so the guest enters a card and confirms it client-side (the
// card itself never touches our server, per Stripe's PCI model) - only
// once that succeeds does a request actually get posted to the team's
// Slack, so an abandoned card form never becomes something staff has to
// look at.
export default function UpgradeRequestSection({
  title,
  description,
  category,
  tiers,
  guestPortalToken,
  publishableKey,
}: {
  title: string;
  description: string;
  category: "early_checkin" | "late_checkout" | "addon";
  tiers: Tier[];
  guestPortalToken: string;
  publishableKey: string;
}) {
  const [tierKey, setTierKey] = useState("");
  const [note, setNote] = useState("");
  const [stage, setStage] = useState<"picking" | "paying" | "done">("picking");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [elements, setElements] = useState<StripeElements | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const paymentElementContainerRef = useRef<HTMLDivElement>(null);

  async function handleRequest() {
    if (!tierKey) {
      setMessage("Pick an option first.");
      return;
    }
    setPending(true);
    setMessage(null);

    const result = await startUpgradeRequest(guestPortalToken, category, tierKey, note);
    if ("error" in result) {
      setMessage(result.error);
      setPending(false);
      return;
    }

    const stripeInstance = await loadStripe(publishableKey);
    if (!stripeInstance) {
      setMessage("Couldn't load the payment form.");
      setPending(false);
      return;
    }

    const elementsInstance = stripeInstance.elements({ clientSecret: result.clientSecret });
    setStripe(stripeInstance);
    setElements(elementsInstance);
    setRequestId(result.requestId);
    setStage("paying");
    setPending(false);

    // Mounted next tick, after the container div above has actually
    // rendered (stage flips to "paying" in the same render pass this
    // function is still running in).
    requestAnimationFrame(() => {
      if (!paymentElementContainerRef.current) return;
      const paymentElement = elementsInstance.create("payment");
      paymentElement.mount(paymentElementContainerRef.current);
    });
  }

  async function handleConfirm() {
    if (!stripe || !elements || !requestId) return;
    setPending(true);
    setMessage(null);

    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    });

    if (error) {
      setMessage(error.message ?? "Card confirmation failed.");
      setPending(false);
      return;
    }

    const paymentMethodId =
      typeof setupIntent?.payment_method === "string" ? setupIntent.payment_method : setupIntent?.payment_method?.id;
    if (!paymentMethodId) {
      setMessage("Something went wrong confirming the card.");
      setPending(false);
      return;
    }

    const finalizeError = await finalizeUpgradeRequestPayment(requestId, paymentMethodId);
    setPending(false);
    if (finalizeError) {
      setMessage(finalizeError);
      return;
    }
    setStage("done");
  }

  if (stage === "done") {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-green-600">Request sent! We&apos;ll text or email you once it&apos;s decided.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-1 text-sm font-semibold text-gray-900">{title}</h2>
      <p className="mb-3 text-sm text-gray-500">{description}</p>

      {stage === "picking" && (
        <div className="space-y-3">
          <div className="space-y-2">
            {tiers.map((tier) => (
              <label key={tier.key} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name={`tier-${category}`}
                  value={tier.key}
                  checked={tierKey === tier.key}
                  onChange={() => setTierKey(tier.key)}
                />
                {tier.label} — {formatPrice(tier.priceCents)}
              </label>
            ))}
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleRequest}
            disabled={pending || !tierKey}
            style={{ backgroundColor: "var(--accent, #111827)" }}
            className="rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Starting..." : "Request"}
          </button>
        </div>
      )}

      {stage === "paying" && (
        <div className="space-y-3">
          <div ref={paymentElementContainerRef} />
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pending}
            style={{ backgroundColor: "var(--accent, #111827)" }}
            className="rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Sending..." : "Confirm & Send Request"}
          </button>
        </div>
      )}

      {message && <p className="mt-2 text-sm text-red-600">{message}</p>}
    </div>
  );
}
