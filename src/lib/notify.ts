import { getEmailCredentials, getSmsCredentials } from "@/lib/settings";

export type NotifyResult = {
  emailSent: boolean;
  smsSent: boolean;
  errors: string[];
};

async function sendEmail(to: string, subject: string, text: string): Promise<string | null> {
  const credentials = await getEmailCredentials();
  if (!credentials) return "Email not configured";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: credentials.fromEmail,
      to: [to],
      subject,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return `Email send failed: ${res.status} ${body.slice(0, 200)}`;
  }

  return null;
}

async function sendSms(to: string, body: string): Promise<string | null> {
  const credentials = await getSmsCredentials();
  if (!credentials) return "SMS not configured";

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${credentials.accountSid}:${credentials.authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: credentials.fromNumber,
        To: to,
        Body: body,
      }),
    }
  );

  if (!res.ok) {
    const responseBody = await res.text();
    return `SMS send failed: ${res.status} ${responseBody.slice(0, 200)}`;
  }

  return null;
}

export async function sendWorkOrderLink(
  teamMember: { email: string | null; phone: string | null },
  propertyName: string,
  link: string
): Promise<NotifyResult> {
  const errors: string[] = [];
  let emailSent = false;
  let smsSent = false;

  const message = `Restock work order for ${propertyName}, due tomorrow: ${link}`;

  if (teamMember.email) {
    const error = await sendEmail(teamMember.email, `Restock work order: ${propertyName}`, message);
    if (error) errors.push(error);
    else emailSent = true;
  }

  if (teamMember.phone) {
    const error = await sendSms(teamMember.phone, message);
    if (error) errors.push(error);
    else smsSent = true;
  }

  return { emailSent, smsSent, errors };
}
