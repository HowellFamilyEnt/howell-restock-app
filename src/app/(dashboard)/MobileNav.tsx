"use client";

import { useState } from "react";
import Link from "next/link";

type NavItem = { href: string; label: string };

export default function MobileNav({
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
      <div className="flex items-center gap-6">
        <span className="whitespace-nowrap font-semibold text-gray-900">Howell Restock</span>
        <nav className="hidden gap-4 text-sm text-gray-600 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="whitespace-nowrap hover:text-gray-900">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3 text-sm text-gray-600">
        <span className="hidden sm:inline">{identityLabel}</span>
        {exitHref ? (
          <a href={exitHref} className="hidden text-gray-500 hover:text-gray-900 md:inline">
            Exit
          </a>
        ) : onSignOut ? (
          <form action={onSignOut} className="hidden md:block">
            <button type="submit" className="text-gray-500 hover:text-gray-900">
              Sign out
            </button>
          </form>
        ) : null}

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Menu"
          aria-expanded={open}
          className="rounded-md border border-gray-300 p-2 text-gray-600 md:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="absolute inset-x-0 top-full z-20 border-b border-gray-200 bg-white shadow-lg md:hidden">
          <nav className="flex flex-col p-2">
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
