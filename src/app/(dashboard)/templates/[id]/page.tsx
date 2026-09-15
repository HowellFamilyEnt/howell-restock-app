import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { updateTemplate, deleteTemplate } from "../actions";
import { CANCELLATION_POLICIES, getAmenitiesOrEmpty } from "@/lib/hostaway";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [template, amenities] = await Promise.all([
    prisma.listingTemplate.findUnique({ where: { id } }),
    getAmenitiesOrEmpty(),
  ]);
  if (!template) notFound();

  const selectedAmenityIds = new Set(template.amenity_ids);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/templates" className="text-sm text-gray-500 hover:text-gray-900">
          ← Templates
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">{template.name}</h1>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {amenities.length === 0 && (
          <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Couldn&apos;t load amenities from Hostaway right now — this template&apos;s previously saved
            amenities are unaffected, but you won&apos;t be able to change the selection until Hostaway
            is reachable again.
          </p>
        )}
        <form action={updateTemplate.bind(null, template.id)} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="col-span-1 space-y-1 sm:col-span-3">
            <label className="text-sm font-medium text-gray-700">Template name</label>
            <input
              name="name"
              defaultValue={template.name}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Price / night</label>
            <input
              name="price"
              type="number"
              step="0.01"
              min={0}
              defaultValue={template.price?.toString() ?? ""}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Currency</label>
            <input
              name="currency_code"
              defaultValue={template.currency_code ?? "USD"}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Guests included</label>
            <input
              name="guests_included"
              type="number"
              min={1}
              defaultValue={template.guests_included ?? 1}
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
              defaultValue={template.price_for_extra_person?.toString() ?? ""}
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
              defaultValue={template.cleaning_fee?.toString() ?? ""}
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
              defaultValue={template.refundable_damage_deposit?.toString() ?? ""}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Cancellation policy</label>
            <select
              name="cancellation_policy"
              defaultValue={template.cancellation_policy ?? ""}
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
              defaultValue={template.min_nights ?? ""}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Max nights</label>
            <input
              name="max_nights"
              type="number"
              min={1}
              defaultValue={template.max_nights ?? ""}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Check-in starts</label>
            <input
              name="check_in_time_start"
              type="time"
              defaultValue={template.check_in_time_start ?? ""}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Check-in ends</label>
            <input
              name="check_in_time_end"
              type="time"
              defaultValue={template.check_in_time_end ?? ""}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Check-out time</label>
            <input
              name="check_out_time"
              type="time"
              defaultValue={template.check_out_time ?? ""}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 pt-6">
            <input
              type="checkbox"
              id="instant_bookable"
              name="instant_bookable"
              defaultChecked={template.instant_bookable}
            />
            <label htmlFor="instant_bookable" className="text-sm text-gray-700">
              Instant bookable
            </label>
          </div>

          <div className="col-span-1 space-y-1 sm:col-span-3">
            <label className="text-sm font-medium text-gray-700">House rules</label>
            <textarea
              name="house_rules"
              rows={3}
              defaultValue={template.house_rules ?? ""}
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
              defaultValue={template.description_template ?? ""}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="col-span-1 space-y-1 sm:col-span-3">
            <label className="text-sm font-medium text-gray-700">Amenities</label>
            <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto rounded-md border border-gray-200 p-3 sm:grid-cols-3">
              {amenities.map((amenity) => (
                <label key={amenity.id} className="flex items-center gap-1.5 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="amenity_ids"
                    value={amenity.id}
                    defaultChecked={selectedAmenityIds.has(amenity.id)}
                  />
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
              Save
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">Delete this template</h2>
        <p className="mb-3 text-sm text-gray-500">
          Doesn&apos;t affect any listing already created from it — only removes it from the New Listing
          page&apos;s template picker.
        </p>
        <form action={deleteTemplate.bind(null, template.id)}>
          <button
            type="submit"
            className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            Delete permanently
          </button>
        </form>
      </div>
    </div>
  );
}
