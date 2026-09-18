import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function NoLockReportPage() {
  const properties = await prisma.property.findMany({
    where: { active: true, smart_lock_id: null },
    orderBy: { name_address: "asc" },
    select: { id: true, name_address: true, address: true, area: true },
  });

  const total = await prisma.property.count({ where: { active: true } });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/reports" className="text-sm text-gray-500 hover:text-gray-900">
          ← Reports
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">Properties without a lock</h1>
        <p className="text-sm text-gray-500">
          {properties.length} of {total} active properties have no Seam smart lock assigned.
        </p>
      </div>

      {properties.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-gray-400">
          Every active property has a lock assigned.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Property</th>
                <th className="px-4 py-2">Address</th>
                <th className="px-4 py-2">Area</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {properties.map((property) => (
                <tr key={property.id}>
                  <td className="px-4 py-2 font-medium text-gray-900">{property.name_address}</td>
                  <td className="px-4 py-2 text-gray-600">{property.address ?? "—"}</td>
                  <td className="px-4 py-2 text-gray-600">{property.area ?? "No area set"}</td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/properties/${property.id}`}
                      target="_blank"
                      className="text-xs font-medium text-gray-600 hover:text-gray-900"
                    >
                      Details →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
