import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSeamApiKey } from "@/lib/settings";
import { listSeamAccessCodes, listUnmanagedSeamAccessCodes, type SeamAccessCode } from "@/lib/seam";

const STATUS_STYLES: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  Set: "bg-green-100 text-green-700",
  Setting: "bg-amber-100 text-amber-700",
  Removing: "bg-amber-100 text-amber-700",
};

function StatusBadge({ status }: { status: string | undefined }) {
  if (!status) return <span className="text-xs text-gray-400">—</span>;
  const style = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>{status}</span>;
}

function formatWindow(startsAt: string | null | undefined, endsAt: string | null | undefined): string {
  if (!startsAt && !endsAt) return "Always on";
  const start = startsAt ? startsAt.slice(0, 16).replace("T", " ") : "—";
  const end = endsAt ? endsAt.slice(0, 16).replace("T", " ") : "—";
  return `${start} – ${end}`;
}

// Live view of every code actually set on a lock, pulled straight from
// Seam rather than just our own DB - the whole reason this page exists
// is that pre-existing/manually-added codes (set through the
// manufacturer's own app, or punched in on the keypad) never show up in
// our GuestAccessCode table at all. Two Seam calls, confirmed live
// 2026-09-16: /access_codes/list (codes this app/Seam manages) and
// /access_codes/unmanaged/list (everything else on the device) - shown
// together as one list, tagged by source.
export default async function LockDetailPage({
  params,
}: {
  params: Promise<{ deviceId: string }>;
}) {
  const { deviceId } = await params;

  const lock = await prisma.seamLock.findUnique({ where: { device_id: deviceId } });
  if (!lock) notFound();

  const property = await prisma.property.findFirst({
    where: { smart_lock_id: deviceId },
    select: { id: true, name_address: true },
  });

  const apiKey = await getSeamApiKey();

  let managed: SeamAccessCode[] = [];
  let unmanaged: SeamAccessCode[] = [];
  let fetchError: string | null = null;

  if (!apiKey) {
    fetchError = "No Seam API key configured on the Settings page.";
  } else {
    try {
      [managed, unmanaged] = await Promise.all([
        listSeamAccessCodes(apiKey, deviceId),
        listUnmanagedSeamAccessCodes(apiKey, deviceId),
      ]);
    } catch (error) {
      fetchError = error instanceof Error ? error.message : "Couldn't reach Seam.";
    }
  }

  const localRecords = await prisma.guestAccessCode.findMany({
    where: { seam_access_code_id: { in: managed.map((c) => c.access_code_id) } },
  });
  const localByCodeId = new Map(localRecords.map((r) => [r.seam_access_code_id, r]));

  const codes = [
    ...managed.map((c) => ({ ...c, source: "Issued by this app" as const })),
    ...unmanaged.map((c) => ({ ...c, source: "Set on the device" as const })),
  ].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/locks" className="text-sm text-gray-500 hover:text-gray-900">
          ← Locks
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">{lock.display_name}</h1>
        <p className="text-sm text-gray-500">
          {lock.manufacturer ?? "Unknown brand"}
          {property && (
            <>
              {" · "}
              <Link href={`/properties/${property.id}`} className="underline hover:text-gray-900">
                {property.name_address}
              </Link>
            </>
          )}
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Access codes</h2>
          <span className="text-xs text-gray-400">Live from Seam, not cached</span>
        </div>

        {fetchError && <p className="text-sm text-red-600">{fetchError}</p>}

        {!fetchError && codes.length === 0 && (
          <p className="text-sm text-gray-400">No codes currently set on this lock.</p>
        )}

        {!fetchError && codes.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Window</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {codes.map((code) => {
                  const local = localByCodeId.get(code.access_code_id);
                  return (
                    <tr key={code.access_code_id}>
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {code.name || "—"}
                        {local && (
                          <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-600">
                            {local.purpose === "guest" ? "Guest code" : "Vendor code"}
                            {local.label ? ` · ${local.label}` : ""}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-700">{code.code ?? "—"}</td>
                      <td className="px-3 py-2 text-gray-600">{formatWindow(code.starts_at, code.ends_at)}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={code.display_status ?? code.status} />
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">{code.source}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
