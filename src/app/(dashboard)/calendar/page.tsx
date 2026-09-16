import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  addUtcDays,
  daysInMonth,
  firstWeekdayOfMonth,
  monthName,
  nextMonth,
  prevMonth,
  todayUtc,
} from "@/lib/calendar";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const today = todayUtc();
  const year = Number(params.year) || today.year;
  const month = Number(params.month) || today.month;

  const [properties, openWorkOrders] = await Promise.all([
    prisma.property.findMany({
      where: { active: true },
      orderBy: { name_address: "asc" },
      include: {
        restockEvents: {
          orderBy: { date: "desc" },
          take: 1,
        },
      },
    }),
    prisma.workOrder.findMany({
      where: { status: "Open", scheduled_for: { not: null } },
      orderBy: { scheduled_for: "asc" },
    }),
  ]);

  const workOrderByProperty = new Map<string, (typeof openWorkOrders)[number]>();
  for (const wo of openWorkOrders) {
    if (!workOrderByProperty.has(wo.property_id)) workOrderByProperty.set(wo.property_id, wo);
  }

  type CalendarEntry = {
    id: string;
    name_address: string;
    urgent_restock_requested: boolean;
    href: string;
  };
  const scheduledByDay = new Map<number, CalendarEntry[]>();
  const notScheduled: typeof properties = [];

  for (const property of properties) {
    const workOrder = workOrderByProperty.get(property.id);

    // A scheduled work order is the real, actionable due date - it takes
    // priority over the projection below, which is just "last restock +
    // cadence" and may no longer be accurate once work orders are in play.
    if (workOrder?.scheduled_for) {
      const due = workOrder.scheduled_for;
      if (due.getUTCFullYear() === year && due.getUTCMonth() + 1 === month) {
        const day = due.getUTCDate();
        const entry: CalendarEntry = {
          id: property.id,
          name_address: property.name_address,
          urgent_restock_requested: property.urgent_restock_requested,
          href: `/work-orders/${workOrder.id}`,
        };
        const existing = scheduledByDay.get(day);
        if (existing) existing.push(entry);
        else scheduledByDay.set(day, [entry]);
      }
      continue; // scheduled (maybe just not in this month) - never "not scheduled"
    }

    const lastEvent = property.restockEvents[0];
    if (!lastEvent) {
      notScheduled.push(property);
      continue;
    }

    const dueDate = addUtcDays(lastEvent.date, property.restock_frequency_days);
    if (dueDate.getUTCFullYear() === year && dueDate.getUTCMonth() + 1 === month) {
      const day = dueDate.getUTCDate();
      const entry: CalendarEntry = {
        id: property.id,
        name_address: property.name_address,
        urgent_restock_requested: property.urgent_restock_requested,
        href: `/properties/${property.id}`,
      };
      const existing = scheduledByDay.get(day);
      if (existing) existing.push(entry);
      else scheduledByDay.set(day, [entry]);
    }
  }

  const totalDays = daysInMonth(year, month);
  const leadingBlanks = firstWeekdayOfMonth(year, month);
  const cells: (number | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prev = prevMonth(year, month);
  const next = nextMonth(year, month);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Restock calendar</h1>
          <p className="text-sm text-gray-500">
            Open work orders show on their due date; properties without one show a projected date
            (last restock + cadence).
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={`/calendar?year=${prev.year}&month=${prev.month}`}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-gray-700 hover:bg-gray-50"
          >
            ← Prev
          </Link>
          <span className="min-w-[10rem] text-center font-medium text-gray-900">
            {monthName(month)} {year}
          </span>
          <Link
            href={`/calendar?year=${next.year}&month=${next.month}`}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-gray-700 hover:bg-gray-50"
          >
            Next →
          </Link>
          <Link
            href="/calendar"
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-gray-700 hover:bg-gray-50"
          >
            Today
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase text-gray-500">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="px-2 py-2 text-center">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const isToday = day !== null && year === today.year && month === today.month && day === today.day;
            const entries = day !== null ? scheduledByDay.get(day) ?? [] : [];

            return (
              <div
                key={i}
                className={`min-h-[7rem] border-b border-r border-gray-100 p-1.5 ${
                  day === null ? "bg-gray-50" : ""
                }`}
              >
                {day !== null && (
                  <>
                    <div
                      className={`mb-1 text-xs font-medium ${
                        isToday
                          ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-white"
                          : "text-gray-500"
                      }`}
                    >
                      {day}
                    </div>
                    <div className="space-y-1">
                      {entries.map((entry) => (
                        <Link
                          key={entry.id}
                          href={entry.href}
                          className={`block truncate rounded px-1.5 py-0.5 text-xs hover:underline ${
                            entry.urgent_restock_requested
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                          title={entry.name_address}
                        >
                          {entry.name_address}
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {notScheduled.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-900">Not yet scheduled</h2>
          <p className="mb-3 text-sm text-gray-500">
            No restock has ever been logged for these active properties, so there&apos;s nothing to
            base a due date on yet.
          </p>
          <div className="flex flex-wrap gap-2">
            {notScheduled.map((property) => (
              <Link
                key={property.id}
                href={`/properties/${property.id}`}
                target="_blank"
                className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:underline"
              >
                {property.name_address}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
