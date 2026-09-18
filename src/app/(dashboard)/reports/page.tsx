import Link from "next/link";

// Index of available reports - deliberately a list of cards rather than
// hardcoding a single report at /reports, since more are coming and each
// gets its own route under here.
const REPORTS = [
  {
    href: "/reports/no-lock",
    title: "Properties without a lock",
    description: "Active properties that don't have a Seam smart lock assigned yet.",
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500">Cross-property comparisons and checks.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {REPORTS.map((report) => (
          <Link
            key={report.href}
            href={report.href}
            className="rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 hover:shadow-sm"
          >
            <h2 className="text-sm font-semibold text-gray-900">{report.title}</h2>
            <p className="mt-1 text-sm text-gray-500">{report.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
