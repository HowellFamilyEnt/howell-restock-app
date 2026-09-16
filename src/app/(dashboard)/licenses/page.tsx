import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { computeLicenseStatus, LICENSE_ALERT_WINDOW_DAYS, type LicenseStatus } from "@/lib/licenses";
import { updateLicenseInfo } from "../properties/[id]/actions";
import CheckLicensesButton from "./CheckLicensesButton";
import CheckHostawayLicensesButton from "./CheckHostawayLicensesButton";
import OwnerField from "./OwnerField";

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

type Row = {
  id: string;
  name: string;
  owner: string | null;
  number: string | null;
  issueDate: string | null;
  expirationDate: string | null;
  status: LicenseStatus;
  hasHostawayListing: boolean;
  confirmed: boolean;
};

const UNASSIGNED_GROUP = "No owner set";

function ConfirmedBadge({ row }: { row: Row }) {
  if (!row.hasHostawayListing) {
    return <span className="w-fit text-xs text-gray-400">—</span>;
  }
  if (row.confirmed) {
    return (
      <span className="w-fit rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        Yes
      </span>
    );
  }
  return (
    <span className="w-fit rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
      Not yet
    </span>
  );
}

export default async function LicensesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const view = status ?? "all";

  const properties = await prisma.property.findMany({
    orderBy: [{ license_owner: "asc" }, { name_address: "asc" }],
  });

  const rows: Row[] = properties.map((p) => ({
    id: p.id,
    name: p.name_address,
    owner: p.license_owner,
    number: p.license_number,
    issueDate: p.license_issue_date ? p.license_issue_date.toISOString().slice(0, 10) : null,
    expirationDate: p.license_expiration_date ? p.license_expiration_date.toISOString().slice(0, 10) : null,
    status: computeLicenseStatus(p.license_expiration_date),
    hasHostawayListing: !!p.hostaway_listing_id,
    confirmed: !!p.license_hostaway_confirmed_at,
  }));

  const counts = {
    all: rows.length,
    ExpiringSoon: rows.filter((r) => r.status === "ExpiringSoon").length,
    Expired: rows.filter((r) => r.status === "Expired").length,
    Active: rows.filter((r) => r.status === "Active").length,
    NotSet: rows.filter((r) => r.status === "NotSet").length,
  };

  const filtered = view === "all" ? rows : rows.filter((r) => r.status === view);

  const allOwners = Array.from(new Set(rows.map((r) => r.owner).filter((o): o is string => !!o))).sort(
    (a, b) => a.localeCompare(b)
  );

  const groups = new Map<string, Row[]>();
  for (const row of filtered) {
    const key = row.owner?.trim() || UNASSIGNED_GROUP;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }
  const groupKeys = Array.from(groups.keys()).sort((a, b) => {
    if (a === UNASSIGNED_GROUP) return 1;
    if (b === UNASSIGNED_GROUP) return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Licenses</h1>
          <p className="text-sm text-gray-500">
            Short-term rental license status, grouped by owner. Alerts go out {LICENSE_ALERT_WINDOW_DAYS}{" "}
            days before expiration.
          </p>
        </div>
        <div className="flex items-start gap-3">
          <CheckLicensesButton />
          <CheckHostawayLicensesButton />
        </div>
      </div>

      <p className="text-xs text-gray-400">
        &ldquo;Check against Hostaway&rdquo; pushes any license here into the matching Hostaway listing so
        it flows to Airbnb from there. Hostaway&apos;s docs say Airbnb can take 2&ndash;3 days to review
        and show license/permit changes once sent — it won&apos;t appear on Airbnb instantly.
      </p>

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

      {groupKeys.length === 0 && (
        <p className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-gray-400">
          No properties in this view.
        </p>
      )}

      {groupKeys.map((owner) => {
        const groupRows = groups.get(owner)!;
        return (
          <div key={owner} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <h2 className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-900">
              {owner} <span className="font-normal text-gray-400">({groupRows.length})</span>
            </h2>

            <div className="hidden overflow-x-auto md:block">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_auto] gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2 text-left text-xs uppercase text-gray-500">
                  <span>Property</span>
                  <span>Owner</span>
                  <span>License #</span>
                  <span>Confirmed</span>
                  <span>Issue date</span>
                  <span>Expiration date</span>
                  <span>Status</span>
                  <span></span>
                </div>
                <div className="divide-y divide-gray-100">
                  {groupRows.map((row) => (
                    <form
                      key={row.id}
                      action={updateLicenseInfo.bind(null, row.id)}
                      className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_auto] items-center gap-2 px-4 py-2"
                    >
                      <Link href={`/properties/${row.id}`} className="min-w-0 truncate text-sm font-medium text-gray-900 hover:underline">
                        {row.name}
                      </Link>
                      <OwnerField owners={allOwners} defaultValue={row.owner ?? ""} />
                      <input
                        name="license_number"
                        defaultValue={row.number ?? ""}
                        className="min-w-0 w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                      <ConfirmedBadge row={row} />
                      <input
                        name="license_issue_date"
                        type="date"
                        defaultValue={row.issueDate ?? ""}
                        className="min-w-0 w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                      <input
                        name="license_expiration_date"
                        type="date"
                        defaultValue={row.expirationDate ?? ""}
                        className="min-w-0 w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                      <span
                        className={`w-fit rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[row.status]}`}
                      >
                        {statusLabels[row.status]}
                      </span>
                      <button
                        type="submit"
                        className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                      >
                        Save
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3 p-3 md:hidden">
              {groupRows.map((row) => (
                <form
                  key={row.id}
                  action={updateLicenseInfo.bind(null, row.id)}
                  className="space-y-2 rounded-lg border border-gray-200 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/properties/${row.id}`} className="font-medium text-gray-900 hover:underline">
                      {row.name}
                    </Link>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[row.status]}`}
                    >
                      {statusLabels[row.status]}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Owner</label>
                    <OwnerField owners={allOwners} defaultValue={row.owner ?? ""} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">License number</label>
                    <input
                      name="license_number"
                      defaultValue={row.number ?? ""}
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-700">Confirmed in Hostaway:</label>
                    <ConfirmedBadge row={row} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-700">Issue date</label>
                      <input
                        name="license_issue_date"
                        type="date"
                        defaultValue={row.issueDate ?? ""}
                        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-700">Expiration date</label>
                      <input
                        name="license_expiration_date"
                        type="date"
                        defaultValue={row.expirationDate ?? ""}
                        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
                  >
                    Save
                  </button>
                </form>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
