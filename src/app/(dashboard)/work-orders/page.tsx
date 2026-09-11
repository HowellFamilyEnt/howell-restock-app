import { prisma } from "@/lib/prisma";
import Link from "next/link";
import SweepButton from "./SweepButton";
import WorkOrdersTable from "./WorkOrdersTable";
import { createWorkOrderForPropertyAction } from "./actions";

const TABS = [
  { key: "active", label: "Open + Completed" },
  { key: "open", label: "Open" },
  { key: "completed", label: "Completed" },
  { key: "archived", label: "Archived" },
  { key: "all", label: "All" },
] as const;

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const view = status ?? "active";

  const [allWorkOrders, properties] = await Promise.all([
    prisma.workOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { property: true, assignedTeamMember: true, items: true },
    }),
    prisma.property.findMany({ where: { active: true }, orderBy: { name_address: "asc" } }),
  ]);

  const counts = {
    open: allWorkOrders.filter((w) => w.status === "Open").length,
    completed: allWorkOrders.filter((w) => w.status === "Completed").length,
    archived: allWorkOrders.filter((w) => w.status === "Archived").length,
    all: allWorkOrders.length,
  };

  const filtered = allWorkOrders.filter((w) => {
    if (view === "open") return w.status === "Open";
    if (view === "completed") return w.status === "Completed";
    if (view === "archived") return w.status === "Archived";
    if (view === "all") return true;
    return w.status !== "Archived"; // "active" default
  });

  const rows = filtered.map((wo) => ({
    id: wo.id,
    propertyName: wo.property.name_address,
    assignedToName: wo.assignedTeamMember?.name ?? "Unassigned",
    dueDate: wo.scheduled_for ? wo.scheduled_for.toISOString().slice(0, 10) : null,
    created: wo.createdAt.toISOString().slice(0, 10),
    sentAt: wo.sent_at ? wo.sent_at.toISOString().slice(0, 10) : null,
    completedCount: wo.items.filter((i) => i.completed).length,
    totalCount: wo.items.length,
    status: wo.status,
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Work orders</h1>
          <p className="text-sm text-gray-500">
            Checks properties due tomorrow and emails/texts the assigned team member a link.
          </p>
        </div>
        <SweepButton />
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {TABS.map((tab) => {
          const isActive = view === tab.key;
          const count =
            tab.key === "active"
              ? counts.open + counts.completed
              : (counts as Record<string, number>)[tab.key];
          return (
            <Link
              key={tab.key}
              href={tab.key === "active" ? "/work-orders" : `/work-orders?status=${tab.key}`}
              className={`rounded-md border px-3 py-1.5 ${
                isActive
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab.label} ({count})
            </Link>
          );
        })}
      </div>

      <WorkOrdersTable rows={rows} />

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Create a work order now</h2>
        <form action={createWorkOrderForPropertyAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium text-gray-700">Property</label>
            <select
              name="property_id"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name_address}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Due date (optional)</label>
            <input
              name="due_date"
              type="date"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Create
          </button>
        </form>
      </div>
    </div>
  );
}
