"use client";

import { ACCESS_SECTIONS } from "@/lib/accessLinks";
import { createAccessLink, toggleAccessLinkActive, deleteAccessLink } from "./actions";
import CopyLinkButton from "@/components/CopyLinkButton";

type AccessLinkRow = {
  id: string;
  name: string;
  token: string;
  sections: string[];
  cleaning_enabled: boolean;
  active: boolean;
};

export default function AccessLinksSection({
  links,
  baseUrl,
}: {
  links: AccessLinkRow[];
  baseUrl: string;
}) {
  return (
    <div className="space-y-4">
      {links.length > 0 && (
        <div className="space-y-3">
          {links.map((link) => (
            <div key={link.id} className={`rounded-lg border border-gray-200 p-4 ${link.active ? "" : "opacity-50"}`}>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{link.name}</p>
                  <p className="text-xs text-gray-500">
                    {[
                      ...link.sections.map((key) => ACCESS_SECTIONS.find((s) => s.key === key)?.label ?? key),
                      ...(link.cleaning_enabled ? ["Cleaning"] : []),
                    ].join(", ")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <form action={toggleAccessLinkActive.bind(null, link.id, !link.active)}>
                    <button type="submit" className="text-xs text-gray-500 hover:text-gray-900">
                      {link.active ? "Active" : "Inactive"}
                    </button>
                  </form>
                  <form action={deleteAccessLink.bind(null, link.id)}>
                    <button type="submit" className="text-xs text-red-600 hover:underline">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
              <div className="space-y-2">
                {link.sections.length > 0 && (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
                      {baseUrl}/access/{link.token}
                    </code>
                    <CopyLinkButton link={`${baseUrl}/access/${link.token}`} />
                  </div>
                )}
                {link.cleaning_enabled && (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
                      {baseUrl}/cleaning/{link.token}
                    </code>
                    <CopyLinkButton link={`${baseUrl}/cleaning/${link.token}`} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <form action={createAccessLink} className="space-y-3 rounded-lg border border-dashed border-gray-300 p-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Name</label>
          <input
            name="name"
            required
            placeholder="e.g. Restocking Team"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-700">Sections this link can access</p>
          <div className="flex flex-wrap gap-3">
            {ACCESS_SECTIONS.map((section) => (
              <label key={section.key} className="flex items-center gap-1.5 text-sm text-gray-700">
                <input type="checkbox" name="sections" value={section.key} />
                {section.label}
              </label>
            ))}
            <label className="flex items-center gap-1.5 text-sm text-gray-700">
              <input type="checkbox" name="cleaning_enabled" />
              Cleaning
            </label>
          </div>
          <p className="text-xs text-gray-400">
            Cleaning is a separate, single-purpose link — pick a property, note what&apos;s needed, add a
            photo, submit. No dashboard tab, doesn&apos;t require any sections above to also be checked.
          </p>
        </div>
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Create link
        </button>
      </form>
    </div>
  );
}
