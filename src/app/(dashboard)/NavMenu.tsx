"use client";

import { useState } from "react";
import Link from "next/link";

type NavItem = { href: string; label: string };

// Same dropdown-menu pattern at every screen size - no separate desktop
// nav row. Tapping/clicking the menu button reveals page links plus
// identity/sign-out; nothing else lives in the header bar.
export default function NavMenu({
  navItems,
  identityLabel,
  exitHref,
  onSignOut,
}: {
  navItems: NavItem[];
  identityLabel: string;
  exitHref: string | null;
  onSignOut?: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <span className="whitespace-nowrap font-semibold text-gray-900">HFE App</span>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        aria-expanded={open}
        className="rounded-md border border-gray-300 p-2 text-gray-600"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-20 border-b border-gray-200 bg-white shadow-lg">
          <nav className="mx-auto flex max-w-5xl flex-col p-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-1 border-t border-gray-200 px-3 pt-3 pb-1 text-xs text-gray-500">
              {identityLabel}
            </div>
            {exitHref ? (
              <a href={exitHref} className="rounded-md px-3 py-2.5 text-sm text-gray-500 hover:bg-gray-50">
                Exit
              </a>
            ) : onSignOut ? (
              <form action={onSignOut}>
                <button
                  type="submit"
                  className="w-full rounded-md px-3 py-2.5 text-left text-sm text-gray-500 hover:bg-gray-50"
                >
                  Sign out
                </button>
              </form>
            ) : null}
          </nav>
        </div>
      )}
    </>
  );
}
