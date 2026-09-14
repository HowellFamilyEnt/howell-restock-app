// Canonical list of sections a no-login /access/[token] link can grant.
// Settings is deliberately never included here - it holds integration
// credentials and always requires the real admin login. The layout
// (src/app/(dashboard)/layout.tsx) enforces this independent of what a
// link's `sections` array happens to contain, so even a corrupted/crafted
// value can't grant Settings.
export const ACCESS_SECTIONS = [
  { key: "properties", label: "Properties", path: "/properties" },
  { key: "items", label: "Items", path: "/items" },
  { key: "restock", label: "Log Restock", path: "/restock" },
  { key: "calendar", label: "Calendar", path: "/calendar" },
  { key: "workorders", label: "Work Orders", path: "/work-orders" },
  { key: "team", label: "Team", path: "/team" },
  { key: "licenses", label: "Licenses", path: "/licenses" },
] as const;

export type SectionKey = (typeof ACCESS_SECTIONS)[number]["key"];

export function sectionKeyForPath(pathname: string): SectionKey | null {
  for (const section of ACCESS_SECTIONS) {
    if (pathname === section.path || pathname.startsWith(`${section.path}/`)) {
      return section.key;
    }
  }
  return null;
}

export function sectionLabel(key: string): string {
  return ACCESS_SECTIONS.find((s) => s.key === key)?.label ?? key;
}

export const ACCESS_COOKIE_NAME = "access_token";
