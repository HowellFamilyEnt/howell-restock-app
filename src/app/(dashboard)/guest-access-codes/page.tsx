import { prisma } from "@/lib/prisma";
import PullBackupCodeButton from "./PullBackupCodeButton";

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

// Read-only log of Seam door codes issued by src/lib/guestAccess.ts
// (guest codes, triggered by the Hostaway webhook) and
// properties/[id]/actions.ts's issueVendorAccessCode (one-off vendor
// codes) - same shape as /booking-confirmations. "Pull backup code" is
// the staff-usable version of the roadmap's guest-facing "code not
// working" button, which belongs on the guest portal (P3) once it exists.
export default async function GuestAccessCodesPage() {
  const codes = await prisma.guestAccessCode.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { property: true },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Guest Access Codes</h1>
        <p className="text-sm text-gray-500">
          {codes.length} recent — Seam-issued codes for guests and one-off vendor visits.
        </p>
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Property</th>
              <th className="px-4 py-2">Purpose</th>
              <th className="px-4 py-2">Window</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Error</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {codes.map((c) => (
              <tr key={c.id}>
                <td className="whitespace-nowrap px-4 py-2 text-gray-600">
                  {c.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                </td>
                <td className="px-4 py-2 font-medium text-gray-900">{c.property?.name_address ?? "—"}</td>
                <td className="px-4 py-2 text-gray-600">
                  {c.purpose === "vendor" ? `Vendor: ${c.label ?? "—"}` : (c.label ?? "Guest")}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-xs text-gray-500">
                  {c.starts_at && c.ends_at
                    ? `${c.starts_at.toISOString().slice(0, 16).replace("T", " ")} → ${c.ends_at
                        .toISOString()
                        .slice(0, 16)
                        .replace("T", " ")}`
                    : "—"}
                </td>
                <td className="px-4 py-2">
                  <StatusBadge ok={!!c.seam_access_code_id} label={c.seam_access_code_id ? "Issued" : "Not issued"} />
                </td>
                <td className="max-w-[16rem] px-4 py-2 text-xs text-gray-500" title={c.error ?? ""}>
                  {c.error ?? "—"}
                </td>
                <td className="px-4 py-2 text-right">
                  {c.seam_access_code_id && <PullBackupCodeButton id={c.id} />}
                </td>
              </tr>
            ))}
            {codes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  Nothing yet — this fills in as smart-lock properties get real bookings and vendor codes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {codes.map((c) => (
          <div key={c.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-gray-900">{c.property?.name_address ?? "—"}</span>
              <span className="shrink-0 text-xs text-gray-400">
                {c.createdAt.toISOString().slice(0, 16).replace("T", " ")}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {c.purpose === "vendor" ? `Vendor: ${c.label ?? "—"}` : (c.label ?? "Guest")}
            </p>
            <div className="mt-2">
              <StatusBadge ok={!!c.seam_access_code_id} label={c.seam_access_code_id ? "Issued" : "Not issued"} />
            </div>
            {c.error && <p className="mt-2 text-xs text-gray-500">{c.error}</p>}
            {c.seam_access_code_id && (
              <div className="mt-2">
                <PullBackupCodeButton id={c.id} />
              </div>
            )}
          </div>
        ))}
        {codes.length === 0 && (
          <p className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-gray-400">
            Nothing yet — this fills in as smart-lock properties get real bookings and vendor codes.
          </p>
        )}
      </div>
    </div>
  );
}
