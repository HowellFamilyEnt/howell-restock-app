// Groups items by room for display on the property detail page's par
// levels table and on work orders (admin + public). Separate concept from
// Item.category (a general product taxonomy) - see the field's doc
// comment in prisma/schema.prisma. An item with no room_groups set lands
// in "Other" rather than being silently dropped.
export const ROOM_GROUP_ORDER = ["Kitchen", "Bathroom", "Laundry Room", "Misc"] as const;

export function groupByRoom<T>(
  items: T[],
  getRoomGroups: (item: T) => string[]
): { label: string; items: T[] }[] {
  const sections: { label: string; items: T[] }[] = ROOM_GROUP_ORDER.map((label) => ({
    label,
    items: items.filter((item) => getRoomGroups(item).includes(label)),
  }));

  const groupedItems = new Set(
    items.filter((item) => getRoomGroups(item).some((g) => (ROOM_GROUP_ORDER as readonly string[]).includes(g)))
  );
  const ungrouped = items.filter((item) => !groupedItems.has(item));
  if (ungrouped.length > 0) sections.push({ label: "Other", items: ungrouped });

  return sections.filter((section) => section.items.length > 0);
}
