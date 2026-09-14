import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { computeLicenseStatus, LICENSE_ALERT_WINDOW_DAYS, type LicenseStatus } from "@/lib/licenses";
import CheckLicensesButton from "./CheckLicensesButton";

const TABS = [
  { key: "all", label: "All" },
  { key: "ExpiringSoon", label: "Expiring soon" },
  { key: "Expired", label: "Expired" },
  { key: "Active", label: "Active" },
  { key: "NotSet", label: "Not set" },
] as const;

const statusStyles: Record<LicenseStatus, string> = {
  Active: "bg-green-100 text-green-700",
  ExpiringSoon: "bg-amber-100 text-amber-700",
  Expired: "bg-red-100 text-red-700",
  NotSet: "bg-gray-100 text-gray-500",
};

const statusLabels: Record<LicenseStatus, string> = {
  Active: "Active",
  ExpiringSoon: "Expiring soon",
  Expired: "Expired",
  NotSet: "Not set",
};

export default async function LicensesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const view = status ?? "all";

  const properties = await prisma.property.findMany({
    orderBy: [{ license_expiration_date: { sort: "asc", nulls: "last" } }, { name_address: "asc" }],
  });

  const rows = properties.map((p) => ({
    id: p.id,
    name: p.name_address,
    owner: p.license_owner,
    number: p.license_number,
    type: p.license_type,
    expires: p.license_expiration_date ? p.license_expiration_date.toISOString().slice(0, 10) : null,
    status: computeLicenseStatus(p.license_expiration_date),
  }));

  const counts = {
    all: rows.length,
    ExpiringSoon: rows.filter((r) => r.status === "ExpiringSoon").length,
    Expired: rows.filter((r) => r.status === "Expired").length,
    Active: rows.filter((r) => r.status === "Active").length,
    NotSet: rows.filter((r) => r.status === "NotSet").length,
  };

  const filtered = view === "all" ? rows : rows.filter((r) => r.status === view);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Licenses</h1>
          <p className="text-sm text-gray-500">
            Short-term rental license status across all properties. Alerts go out{" "}
            {LICENSE_ALERT_WINDOW_DAYS} days before expiration.
          </p>
        </div>
        <CheckLicensesButton />
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === "all" ? "/licenses" : `/licenses?status=${tab.key}`}
            className={`rounded-md border px-3 py-1.5 ${
              view === tab.key
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {tab.label} ({counts[tab.key]})
          </Link>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Property</th>
              <th className="px-4 py-2">Owner</th>
              <th className="px-4 py-2">License #</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Expires</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-2 font-medium text-gray-900">{row.name}</td>
                <td className="px-4 py-2 text-gray-600">{row.owner ?? "—"}</td>
                <td className="px-4 py-2 text-gray-600">{row.number ?? "—"}</td>
                <td className="px-4 py-2 text-gray-600">{row.type ?? "—"}</td>
                <td className="px-4 py-2 text-gray-600">{row.expires ?? "—"}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[row.status]}`}>
                    {statusLabels[row.status]}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/properties/${row.id}`} className="text-xs font-medium text-gray-600 hover:text-gray-900">
                    Edit →
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  No properties in this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {filtered.map((row) => (
          <Link
            key={row.id}
            href={`/properties/${row.id}`}
            className="block rounded-lg border border-gray-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-gray-900">{row.name}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[row.status]}`}>
                {statusLabels[row.status]}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
              <span>Owner: {row.owner ?? "—"}</span>
              <span>License: {row.number ?? "—"}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              <span>{row.type ?? "No type set"}</span>
              <span>Expires: {row.expires ?? "—"}</span>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-gray-400">
            No properties in this view.
          </p>
        )}
      </div>
    </div>
  );
}
