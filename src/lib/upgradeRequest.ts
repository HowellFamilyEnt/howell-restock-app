"use server";

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  getStripeSecretKey,
  getSlackCredentials,
  getSeamApiKey,
  getHostawayCredentials,
} from "@/lib/settings";
import { createSetupIntent, chargeOffSession } from "@/lib/stripe";
import { postUpgradeRequestToSlack, reactToSlackMessage } from "@/lib/slack";
import { updateSeamAccessCode } from "@/lib/seam";
import { getAccessToken, updateReservationTimes } from "@/lib/hostaway";
import { baseUrl } from "@/lib/workorders";
import { zonedTimeToUtc } from "@/lib/calendar";
import { EARLY_CHECKIN_TIERS, LATE_CHECKOUT_TIERS, ADDON_TIERS, formatPrice } from "@/lib/upgradeTiers";

type Category = "early_checkin" | "late_checkout" | "addon";

function findTier(category: Category, tierKey: string) {
  const list =
    category === "early_checkin" ? EARLY_CHECKIN_TIERS : category === "late_checkout" ? LATE_CHECKOUT_TIERS : ADDON_TIERS;
  return list.find((t) => t.key === tierKey) ?? null;
}

// Called when the guest picks a tier and hits "Request" - creates the
// row, a Stripe Customer + SetupIntent, and returns the client_secret the
// guest-facing Stripe Elements form needs to actually collect the card.
// Nothing is charged here; nothing is posted to Slack yet either (that
// happens once the card is actually confirmed, in
// finalizeUpgradeRequestPayment below), so an abandoned card form never
// generates a request the team has to look at.
export async function startUpgradeRequest(
  guestPortalToken: string,
  category: Category,
  tierKey: string,
  note: string
): Promise<{ requestId: string; clientSecret: string } | { error: string }> {
  const confirmation = await prisma.bookingConfirmation.findUnique({
    where: { share_token: guestPortalToken },
    include: { property: true },
  });
  if (!confirmation || !confirmation.property) return { error: "Not found." };

  const tier = findTier(category, tierKey);
  if (!tier) return { error: "Invalid option selected." };

  const stripeKey = await getStripeSecretKey();
  if (!stripeKey) return { error: "Upgrades aren't available right now — contact us directly." };

  const newCheckInHour =
    category === "early_checkin" && confirmation.check_in_hour !== null
      ? confirmation.check_in_hour - (tier as (typeof EARLY_CHECKIN_TIERS)[number]).hoursEarly
      : null;
  const newCheckOutHour =
    category === "late_checkout" && confirmation.check_out_hour !== null
      ? confirmation.check_out_hour + (tier as (typeof LATE_CHECKOUT_TIERS)[number]).hoursLate
      : null;

  let setup;
  try {
    setup = await createSetupIntent(stripeKey, {
      email: confirmation.guest_email,
      description: `${confirmation.property.name_address} — ${tier.label}`,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't start payment setup." };
  }

  const shareToken = crypto.randomBytes(24).toString("hex");
  const request = await prisma.upgradeRequest.create({
    data: {
      property_id: confirmation.property.id,
      hostaway_reservation_id: confirmation.hostaway_reservation_id,
      share_token: shareToken,
      category,
      tier_label: tier.label,
      price_cents: tier.priceCents,
      new_check_in_hour: newCheckInHour,
      new_check_out_hour: newCheckOutHour,
      guest_note: note || null,
      guest_name: confirmation.guest_name,
      guest_email: confirmation.guest_email,
      stripe_customer_id: setup.customerId,
      stripe_setup_intent_id: setup.setupIntentId,
    },
  });

  return { requestId: request.id, clientSecret: setup.clientSecret };
}

// Called once the guest's card is confirmed client-side - saves the
// payment method, flips the request to "pending", and posts it to Slack
// (mirroring SuiteOp's own #upsell message shape).
export async function finalizeUpgradeRequestPayment(requestId: string, paymentMethodId: string): Promise<string> {
  const request = await prisma.upgradeRequest.findUnique({ where: { id: requestId }, include: { property: true } });
  if (!request) return "Not found.";

  const confirmation = await prisma.bookingConfirmation.findUnique({
    where: { hostaway_reservation_id: request.hostaway_reservation_id },
  });

  const scheduledDate =
    (request.category === "late_checkout" ? confirmation?.departure_date : confirmation?.arrival_date)
      ?.toISOString()
      .slice(0, 10) ?? "—";

  const slack = await getSlackCredentials();
  let slackMessageTs: string | null = null;
  let error: string | null = null;

  if (slack) {
    try {
      const { ts } = await postUpgradeRequestToSlack(slack.botToken, slack.channelId, {
        guestName: request.guest_name ?? "Guest",
        reservationConfirmationCode: confirmation?.confirmation_code ?? request.hostaway_reservation_id,
        propertyName: request.property.name_address,
        upsellLabel: `${request.tier_label} — ${formatPrice(request.price_cents)}`,
        scheduledDate,
        note: request.guest_note,
        reviewUrl: `${baseUrl()}/upgrade-review/${request.share_token}`,
      });
      slackMessageTs = ts;
    } catch (e) {
      error = e instanceof Error ? e.message : "Slack post failed.";
    }
  } else {
    error = "Slack not configured — request saved but not posted.";
  }

  await prisma.upgradeRequest.update({
    where: { id: requestId },
    data: {
      stripe_payment_method_id: paymentMethodId,
      status: "pending",
      slack_message_ts: slackMessageTs,
      error,
    },
  });

  revalidatePath("/guest-access-codes");
  return error ?? "";
}

// The review page's action. Deny: reacts ❌, nothing charged. Approve:
// charges off-session, then - only for early_checkin/late_checkout, an
// addon has no time to push - writes the new time to Hostaway and shifts
// the Seam code window (if one exists) to match, reacting ✅. A declined
// charge reacts ⚠️ instead and stops there (nothing else applied).
export async function decideUpgradeRequest(
  shareToken: string,
  decision: "approved" | "denied",
  deciderName: string
): Promise<string> {
  const request = await prisma.upgradeRequest.findUnique({
    where: { share_token: shareToken },
    include: { property: true },
  });
  if (!request) return "Not found.";
  if (request.status !== "pending") return `Already ${request.status}.`;

  const slack = await getSlackCredentials();

  if (decision === "denied") {
    await prisma.upgradeRequest.update({
      where: { id: request.id },
      data: { status: "denied", decided_by_name: deciderName || null, decided_at: new Date() },
    });
    if (slack && request.slack_message_ts) {
      await reactToSlackMessage(slack.botToken, slack.channelId, request.slack_message_ts, "x").catch(() => {});
    }
    revalidatePath("/upgrade-review/[token]", "page");
    return "Denied.";
  }

  const stripeKey = await getStripeSecretKey();
  if (!stripeKey || !request.stripe_customer_id || !request.stripe_payment_method_id) {
    return "Missing Stripe details — can't charge.";
  }

  const charge = await chargeOffSession(stripeKey, {
    customerId: request.stripe_customer_id,
    paymentMethodId: request.stripe_payment_method_id,
    amountCents: request.price_cents,
    description: `${request.property.name_address} — ${request.tier_label}`,
    // Lets this charge be told apart from reservation payments in
    // Stripe's dashboard/API/exports - this is upsell revenue kept by
    // the business, never paid out to the property owner.
    metadata: {
      source: "hfe_upgrade_request",
      category: request.category,
      property_id: request.property_id,
      property_name: request.property.name_address,
      hostaway_reservation_id: request.hostaway_reservation_id,
      upgrade_request_id: request.id,
    },
  });

  if (!charge.succeeded) {
    await prisma.upgradeRequest.update({
      where: { id: request.id },
      data: {
        status: "payment_failed",
        stripe_payment_intent_id: charge.paymentIntentId,
        error: charge.error,
        decided_by_name: deciderName || null,
        decided_at: new Date(),
      },
    });
    if (slack && request.slack_message_ts) {
      await reactToSlackMessage(slack.botToken, slack.channelId, request.slack_message_ts, "warning").catch(() => {});
    }
    revalidatePath("/upgrade-review/[token]", "page");
    return `Approved, but the charge failed: ${charge.error}`;
  }

  const applyErrors: string[] = [];

  if (request.category !== "addon") {
    const confirmation = await prisma.bookingConfirmation.findUnique({
      where: { hostaway_reservation_id: request.hostaway_reservation_id },
    });

    try {
      const credentials = await getHostawayCredentials();
      if (!credentials) throw new Error("No Hostaway credentials configured.");
      const token = await getAccessToken(credentials.accountId, credentials.apiKey);
      await updateReservationTimes(token, Number(request.hostaway_reservation_id), {
        checkInTime: request.new_check_in_hour ?? undefined,
        checkOutTime: request.new_check_out_hour ?? undefined,
      });
    } catch (e) {
      applyErrors.push(`Hostaway: ${e instanceof Error ? e.message : "update failed"}`);
    }

    try {
      const guestAccessCode = await prisma.guestAccessCode.findUnique({
        where: { hostaway_reservation_id: request.hostaway_reservation_id },
      });
      const seamKey = await getSeamApiKey();
      const timezone = request.property.timezone;

      if (guestAccessCode?.seam_access_code_id && seamKey && timezone && confirmation) {
        if (request.category === "early_checkin" && request.new_check_in_hour !== null) {
          const newCheckIn = zonedTimeToUtc(
            confirmation.arrival_date!.toISOString().slice(0, 10),
            request.new_check_in_hour,
            timezone
          );
          const newStartsAt = new Date(newCheckIn.getTime() - 60 * 60 * 1000);
          await updateSeamAccessCode(seamKey, {
            accessCodeId: guestAccessCode.seam_access_code_id,
            startsAt: newStartsAt,
            endsAt: guestAccessCode.ends_at ?? newCheckIn,
          });
        } else if (request.category === "late_checkout" && request.new_check_out_hour !== null) {
          const newEndsAt = zonedTimeToUtc(
            confirmation.departure_date!.toISOString().slice(0, 10),
            request.new_check_out_hour,
            timezone
          );
          await updateSeamAccessCode(seamKey, {
            accessCodeId: guestAccessCode.seam_access_code_id,
            startsAt: guestAccessCode.starts_at ?? newEndsAt,
            endsAt: newEndsAt,
          });
        }
      }
    } catch (e) {
      applyErrors.push(`Seam: ${e instanceof Error ? e.message : "window shift failed"}`);
    }
  }

  await prisma.upgradeRequest.update({
    where: { id: request.id },
    data: {
      status: "approved",
      stripe_payment_intent_id: charge.paymentIntentId,
      decided_by_name: deciderName || null,
      decided_at: new Date(),
      error: applyErrors.length > 0 ? applyErrors.join("; ") : null,
    },
  });

  if (slack && request.slack_message_ts) {
    await reactToSlackMessage(slack.botToken, slack.channelId, request.slack_message_ts, "white_check_mark").catch(
      () => {}
    );
  }

  revalidatePath("/upgrade-review/[token]", "page");
  return applyErrors.length > 0 ? `Approved and charged, but: ${applyErrors.join("; ")}` : "Approved!";
}
