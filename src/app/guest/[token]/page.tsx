import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatHour, formatReservationDate } from "@/lib/calendar";
import BackupCodeButton from "./BackupCodeButton";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold text-gray-900">{title}</h2>
      {children}
    </div>
  );
}

// No-login guest portal (SuiteOp roadmap P3), reached via the link in the
// direct booking-confirmation email/text (src/lib/bookingConfirmation.ts).
// Same access-control shape as /wo/[token]: the share_token itself is the
// only gate, looked up fresh here rather than trusted from the client.
export default async function GuestPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const confirmation = await prisma.bookingConfirmation.findUnique({
    where: { share_token: token },
    include: { property: true },
  });

  if (!confirmation || !confirmation.property) notFound();
  const property = confirmation.property;

  const guestAccessCode = await prisma.guestAccessCode.findUnique({
    where: { hostaway_reservation_id: confirmation.hostaway_reservation_id },
  });

  const arrivalDateStr = confirmation.arrival_date?.toISOString().slice(0, 10);
  const departureDateStr = confirmation.departure_date?.toISOString().slice(0, 10);
  const checkInLabel = formatHour(confirmation.check_in_hour);
  const checkOutLabel = formatHour(confirmation.check_out_hour);

  const hasDigitalKey = guestAccessCode?.code;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{property.name_address}</h1>
          {property.address && <p className="text-sm text-gray-500">{property.address}</p>}
        </div>

        <Section title="Your stay">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase text-gray-400">Check-in</p>
              <p className="text-gray-900">
                {arrivalDateStr ? formatReservationDate(arrivalDateStr) : "—"}
                {checkInLabel && <span className="block text-gray-500">after {checkInLabel}</span>}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-400">Check-out</p>
              <p className="text-gray-900">
                {departureDateStr ? formatReservationDate(departureDateStr) : "—"}
                {checkOutLabel && <span className="block text-gray-500">by {checkOutLabel}</span>}
              </p>
            </div>
          </div>
        </Section>

        <Section title="Getting in">
          {hasDigitalKey ? (
            <div>
              <p className="text-2xl font-semibold tracking-wide text-gray-900">{guestAccessCode.code}</p>
              {guestAccessCode.starts_at && guestAccessCode.ends_at && (
                <p className="mt-1 text-xs text-gray-500">
                  Active {guestAccessCode.starts_at.toISOString().slice(0, 16).replace("T", " ")} –{" "}
                  {guestAccessCode.ends_at.toISOString().slice(0, 16).replace("T", " ")}
                </p>
              )}
              <BackupCodeButton token={token} />
            </div>
          ) : property.master_door_code ? (
            <p className="text-2xl font-semibold tracking-wide text-gray-900">{property.master_door_code}</p>
          ) : (
            <p className="text-sm text-gray-500">Access details will be sent separately before check-in.</p>
          )}
        </Section>

        {property.guest_checkin_instructions && (
          <Section title="Building & unit access">
            <p className="whitespace-pre-wrap text-sm text-gray-700">{property.guest_checkin_instructions}</p>
          </Section>
        )}

        {(property.wifi_name || property.wifi_password) && (
          <Section title="WiFi">
            <div className="text-sm text-gray-700">
              {property.wifi_name && (
                <p>
                  Network: <span className="font-medium">{property.wifi_name}</span>
                </p>
              )}
              {property.wifi_password && (
                <p>
                  Password: <span className="font-medium">{property.wifi_password}</span>
                </p>
              )}
            </div>
          </Section>
        )}

        {property.house_rules && (
          <Section title="House rules">
            <p className="whitespace-pre-wrap text-sm text-gray-700">{property.house_rules}</p>
          </Section>
        )}
      </div>
    </div>
  );
}
