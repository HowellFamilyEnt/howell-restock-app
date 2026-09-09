import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { setParLevel } from "./actions";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id },
    include: { parLevels: true },
  });

  if (!property) notFound();

  const items = await prisma.item.findMany({ orderBy: { name: "asc" } });
  const parByItemId = new Map(property.parLevels.map((p) => [p.item_id, p.target_qty]));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/properties" className="text-sm text-gray-500 hover:text-gray-900">
          ← Properties
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">{property.name_address}</h1>
        <p className="text-sm text-gray-500">
          {property.type} · {property.unit_count} unit{property.unit_count === 1 ? "" : "s"} · cadence{" "}
          {property.restock_frequency_days}d
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Item</th>
              <th className="px-4 py-2">Unit</th>
              <th className="px-4 py-2">Par (target qty)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-2 font-medium text-gray-900">{item.name}</td>
                <td className="px-4 py-2 text-gray-600">{item.unit_of_measure}</td>
                <td className="px-4 py-2">
                  <form
                    action={setParLevel.bind(null, property.id, item.id)}
                    className="flex items-center gap-2"
                  >
                    <input
                      name="target_qty"
                      type="number"
                      min={0}
                      defaultValue={parByItemId.get(item.id) ?? 0}
                      className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    />
                    <button
                      type="submit"
                      className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                    >
                      Save
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                  No items in the catalog yet — add some on the Items page first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
