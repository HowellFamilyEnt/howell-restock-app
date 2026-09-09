import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ACCESS_SECTIONS, ACCESS_COOKIE_NAME, sectionKeyForPath } from "@/lib/accessLinks";

const ALL_NAV_ITEMS = [
  { href: "/properties", label: "Properties" },
  { href: "/items", label: "Items" },
  { href: "/restock", label: "Log Restock" },
  { href: "/calendar", label: "Calendar" },
  { href: "/work-orders", label: "Work Orders" },
  { href: "/team", label: "Team" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const pathname = (await headers()).get("x-pathname") ?? "/properties";

  let navItems = [...ALL_NAV_ITEMS, { href: "/settings", label: "Settings" }];
  let identityLabel = session?.user?.email ?? "";
  let exitHref: string | null = null; // set for access-link sessions

  if (!session) {
    const cookieStore = await cookies();
    const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
    const link = token ? await prisma.accessLink.findUnique({ where: { token } }) : null;

    if (!link || !link.active) {
      redirect("/login");
    }

    // Settings can never be reached via an access link, full stop -
    // regardless of what's stored in `sections`.
    const currentSection = sectionKeyForPath(pathname);
    if (pathname.startsWith("/settings") || !currentSection || !link.sections.includes(currentSection)) {
      const firstAllowed = ACCESS_SECTIONS.find((s) => link.sections.includes(s.key));
      redirect(firstAllowed?.path ?? "/login");
    }

    navItems = ALL_NAV_ITEMS.filter((item) =>
      link.sections.includes(sectionKeyForPath(item.href) ?? "")
    );
    identityLabel = link.name;
    exitHref = "/access/exit";
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-gray-900">Howell Restock</span>
            <nav className="flex gap-4 text-sm text-gray-600">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-gray-900">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>{identityLabel}</span>
            {exitHref ? (
              <a href={exitHref} className="text-gray-500 hover:text-gray-900">
                Exit
              </a>
            ) : (
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button type="submit" className="text-gray-500 hover:text-gray-900">
                  Sign out
                </button>
              </form>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
