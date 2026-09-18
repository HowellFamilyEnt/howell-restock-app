// Confirmed live against Slack's public API docs (2026-09-16): Bearer
// token auth, chat.postMessage returns a `ts` (message timestamp) that's
// the handle reactions.add needs to react to that same message later.

const SLACK_API_URL = "https://slack.com/api";

async function slackRequest<T extends { ok: boolean; error?: string }>(
  botToken: string,
  method: string,
  body: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${SLACK_API_URL}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${botToken}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as T;
  // Slack's API returns 200 even on failure, with ok:false + an error
  // code in the body - HTTP status alone doesn't tell you it worked.
  if (!res.ok || !data.ok) {
    throw new Error(`Slack ${method} failed: ${res.status} ${data.error ?? JSON.stringify(data)}`);
  }
  return data;
}

// Mirrors the fields SuiteOp's own #upsell message already uses (per the
// screenshot the user shared): Guest, Reservation, Property, Upsell,
// Scheduled Date, Note, plus a link to our own review page in place of
// SuiteOp's "Click here to see the upsell".
export async function postUpgradeRequestToSlack(
  botToken: string,
  channelId: string,
  fields: {
    guestName: string;
    reservationConfirmationCode: string;
    propertyName: string;
    upsellLabel: string;
    scheduledDate: string;
    note: string | null;
    reviewUrl: string;
  }
): Promise<{ ts: string }> {
  const text = [
    `*UPGRADE REQUEST*`,
    `*Guest:* ${fields.guestName}`,
    `*Reservation:* ${fields.reservationConfirmationCode}`,
    `*Property:* ${fields.propertyName}`,
    `*Upsell:* ${fields.upsellLabel}`,
    `*Scheduled Date:* ${fields.scheduledDate}`,
    fields.note ? `*Note:* ${fields.note}` : null,
    `<${fields.reviewUrl}|Click here to review the request>`,
  ]
    .filter(Boolean)
    .join("\n");

  const data = await slackRequest<{ ok: boolean; ts: string }>(botToken, "chat.postMessage", {
    channel: channelId,
    text,
  });
  return { ts: data.ts };
}

export async function postSlackMessage(botToken: string, channelId: string, text: string): Promise<{ ts: string }> {
  const data = await slackRequest<{ ok: boolean; ts: string }>(botToken, "chat.postMessage", {
    channel: channelId,
    text,
  });
  return { ts: data.ts };
}

export async function reactToSlackMessage(
  botToken: string,
  channelId: string,
  ts: string,
  emoji: string
): Promise<void> {
  await slackRequest(botToken, "reactions.add", { channel: channelId, timestamp: ts, name: emoji });
}

export async function deleteSlackMessage(botToken: string, channelId: string, ts: string): Promise<void> {
  await slackRequest(botToken, "chat.delete", { channel: channelId, ts });
}
