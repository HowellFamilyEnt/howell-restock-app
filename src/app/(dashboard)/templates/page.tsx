import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { createTemplate, deleteTemplate } from "./actions";
import { CANCELLATION_POLICIES, getAmenitiesOrEmpty } from "@/lib/hostaway";

export default async function TemplatesPage() {
  const [templates, amenities] = await Promise.all([
    prisma.listingTemplate.findMany({ orderBy: { name: "asc" } }),
    getAmenitiesOrEmpty(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Listing templates</h1>
        <p className="text-sm text-gray-500">
          Reusable defaults for creating a new listing — pricing, amenities, policies. Applied (and
          still editable) on the New Listing page.
        </p>
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Price</th>
              <th className="px-4 py-2">Cancellation policy</th>
              <th className="px-4 py-2">Amenities</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {templates.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-2 font-medium text-gray-900">{t.name}</td>
                <td className="px-4 py-2 text-gray-600">
                  {t.price ? `$${t.price.toString()} ${t.currency_code ?? ""}` : "—"}
                </td>
                <td className="px-4 py-2 text-gray-600">{t.cancellation_policy ?? "—"}</td>
                <td className="px-4 py-2 text-gray-600">{t.amenity_ids.length}</td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/templates/${t.id}`}
                      className="text-xs font-medium text-gray-600 hover:text-gray-900"
                    >
                      Edit →
                    </Link>
                    <form action={deleteTemplate.bind(null, t.id)}>
                      <button type="submit" className="text-xs text-red-600 hover:underline">
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {templates.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No templates yet — add one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {templates.map((t) => (
          <div key={t.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/templates/${t.id}`} className="font-medium text-gray-900 hover:underline">
                {t.name}
              </Link>
              <form action={deleteTemplate.bind(null, t.id)}>
                <button type="submit" className="text-xs text-red-600 hover:underline">
                  Delete
                </button>
              </form>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
              <span>{t.price ? `$${t.price.toString()} ${t.currency_code ?? ""}` : "No price set"}</span>
              <span>{t.cancellation_policy ?? "No cancellation policy"}</span>
              <span>{t.amenity_ids.length} amenities</span>
            </div>
          </div>
        ))}
        {templates.length === 0 && (
          <p className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-gray-400">
            No templates yet — add one below.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Add a template</h2>
        {amenities.length === 0 && (
          <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Couldn&apos;t load amenities from Hostaway — check the Hostaway credentials on the Settings
            page. You can still save a template without amenities and add them later.
          </p>
        )}
        <form action={createTemplate} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="col-span-1 space-y-1 sm:col-span-3">
            <label className="text-sm font-medium text-gray-700">Template name</label>
            <input name="name" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Price / night</label>
            <input
              name="price"
              type="number"
              step="0.01"
              min={0}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Currency</label>
            <input
              name="currency_code"
              defaultValue="USD"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Guests included</label>
            <input
              name="guests_included"
              type="number"
              min={1}
              defaultValue={1}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Price per extra guest</label>
            <input
              name="price_for_extra_person"
              type="number"
              step="0.01"
              min={0}
              defaultValue={0}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Cleaning fee</label>
            <input
              name="cleaning_fee"
              type="number"
              step="0.01"
              min={0}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Refundable damage deposit</label>
            <input
              name="refundable_damage_deposit"
              type="number"
              step="0.01"
              min={0}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Cancellation policy</label>
            <select
              name="cancellation_policy"
              defaultValue=""
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Not set</option>
              {CANCELLATION_POLICIES.map((policy) => (
                <option key={policy} value={policy}>
                  {policy}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Min nights</label>
            <input
              name="min_nights"
              type="number"
              min={1}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Max nights</label>
            <input
              name="max_nights"
              type="number"
              min={1}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Check-in starts</label>
            <input
              name="check_in_time_start"
              type="time"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Check-in ends</label>
            <input
              name="check_in_time_end"
              type="time"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Check-out time</label>
            <input
              name="check_out_time"
              type="time"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 pt-6">
            <input type="checkbox" id="instant_bookable" name="instant_bookable" defaultChecked />
            <label htmlFor="instant_bookable" className="text-sm text-gray-700">
              Instant bookable
            </label>
          </div>

          <div className="col-span-1 space-y-1 sm:col-span-3">
            <label className="text-sm font-medium text-gray-700">House rules</label>
            <textarea
              name="house_rules"
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="col-span-1 space-y-1 sm:col-span-3">
            <label className="text-sm font-medium text-gray-700">
              Description template — supports {"{bedrooms}"}, {"{bathrooms}"}, {"{city}"}, {"{state}"},{" "}
              {"{amenities}"}
            </label>
            <textarea
              name="description_template"
              rows={4}
              placeholder="Welcome to this beautiful {bedrooms}-bedroom, {bathrooms}-bathroom home in {city}, {state}!"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="col-span-1 space-y-1 sm:col-span-3">
            <label className="text-sm font-medium text-gray-700">Amenities</label>
            <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto rounded-md border border-gray-200 p-3 sm:grid-cols-3">
              {amenities.map((amenity) => (
                <label key={amenity.id} className="flex items-center gap-1.5 text-sm text-gray-700">
                  <input type="checkbox" name="amenity_ids" value={amenity.id} />
                  {amenity.name}
                </label>
              ))}
            </div>
          </div>

          <div className="col-span-1 sm:col-span-3">
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Add template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
