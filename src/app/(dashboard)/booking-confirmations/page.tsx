import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { baseUrl } from "@/lib/workorders";
import CopyLinkButton from "@/components/CopyLinkButton";

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
    >
      {label}
    </span>
  );
}

// Read-only log of the direct booking-confirmation emails/texts sent by
// src/lib/bookingConfirmation.ts (triggered by the Hostaway "reservation
// created" webhook) - the only place to see whether a guest actually got
// their info, since reservations aren't mirrored anywhere else in this app.
export default async function BookingConfirmationsPage() {
  const confirmations = await prisma.bookingConfirmation.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { property: true },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Booking Confirmations</h1>
        <p className="text-sm text-gray-500">
          {confirmations.length} recent — direct email/text sent to each guest within minutes of booking.
        </p>
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Guest</th>
              <th className="px-4 py-2">Property</th>
              <th className="px-4 py-2">Arrival</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">SMS</th>
              <th className="px-4 py-2">Errors</th>
              <th className="px-4 py-2">Guest link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {confirmations.map((c) => {
              const guestLink = c.share_token ? `${baseUrl()}/guest/${c.share_token}` : null;
              return (
                <tr key={c.id}>
                  <td className="whitespace-nowrap px-4 py-2 text-gray-600">
                    {c.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                  </td>
                  <td className="px-4 py-2 font-medium text-gray-900">{c.guest_name ?? "—"}</td>
                  <td className="px-4 py-2 text-gray-600">{c.property?.name_address ?? "No matching property"}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-gray-600">
                    {c.arrival_date ? c.arrival_date.toISOString().slice(0, 10) : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge ok={c.email_sent} label={c.email_sent ? "Sent" : "Not sent"} />
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge ok={c.sms_sent} label={c.sms_sent ? "Sent" : "Not sent"} />
                  </td>
                  <td className="max-w-[20rem] px-4 py-2 text-xs text-gray-500" title={c.errors ?? ""}>
                    {c.errors ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    {guestLink ? (
                      <div className="flex items-center gap-2">
                        <Link
                          href={guestLink}
                          target="_blank"
                          className="whitespace-nowrap text-xs font-medium text-gray-600 hover:text-gray-900"
                        >
                          Open →
                        </Link>
                        <CopyLinkButton link={guestLink} />
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
            {confirmations.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                  Nothing yet — this fills in as new Hostaway bookings come in.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {confirmations.map((c) => {
          const guestLink = c.share_token ? `${baseUrl()}/guest/${c.share_token}` : null;
          return (
            <div key={c.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-gray-900">{c.guest_name ?? "—"}</span>
                <span className="shrink-0 text-xs text-gray-400">
                  {c.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">{c.property?.name_address ?? "No matching property"}</p>
              <p className="mt-1 text-sm text-gray-500">
                Arrival: {c.arrival_date ? c.arrival_date.toISOString().slice(0, 10) : "—"}
              </p>
              <div className="mt-2 flex gap-2">
                <StatusBadge ok={c.email_sent} label={c.email_sent ? "Email sent" : "Email not sent"} />
                <StatusBadge ok={c.sms_sent} label={c.sms_sent ? "SMS sent" : "SMS not sent"} />
              </div>
              {c.errors && <p className="mt-2 text-xs text-gray-500">{c.errors}</p>}
              {guestLink && (
                <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
                  <Link
                    href={guestLink}
                    target="_blank"
                    className="text-xs font-medium text-gray-600 hover:text-gray-900"
                  >
                    Open guest page →
                  </Link>
                  <CopyLinkButton link={guestLink} />
                </div>
              )}
            </div>
          );
        })}
        {confirmations.length === 0 && (
          <p className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-gray-400">
            Nothing yet — this fills in as new Hostaway bookings come in.
          </p>
        )}
      </div>
    </div>
  );
}
