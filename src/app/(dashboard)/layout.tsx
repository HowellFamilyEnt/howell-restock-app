import Link from "next/link";
import { auth, signOut } from "@/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-gray-900">Howell Restock</span>
            <nav className="flex gap-4 text-sm text-gray-600">
              <Link href="/properties" className="hover:text-gray-900">
                Properties
              </Link>
              <Link href="/items" className="hover:text-gray-900">
                Items
              </Link>
              <Link href="/restock" className="hover:text-gray-900">
                Log Restock
              </Link>
              <Link href="/calendar" className="hover:text-gray-900">
                Calendar
              </Link>
              <Link href="/settings" className="hover:text-gray-900">
                Settings
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>{session?.user?.email}</span>
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
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
