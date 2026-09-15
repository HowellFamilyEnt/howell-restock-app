"use client";

import { useActionState, useRef, useState } from "react";

const CANCELLATION_POLICIES = ["flexible", "moderate", "firm", "strict", "no_refund"] as const;
const BEDROOM_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const BATHROOM_OPTIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8];

export type TemplateOption = {
  id: string;
  name: string;
  currency_code: string | null;
  price: string | null;
  price_for_extra_person: string | null;
  guests_included: number | null;
  cleaning_fee: string | null;
  refundable_damage_deposit: string | null;
  cancellation_policy: string | null;
  check_in_time_start: string | null;
  check_in_time_end: string | null;
  check_out_time: string | null;
  min_nights: number | null;
  max_nights: number | null;
  instant_bookable: boolean;
  house_rules: string | null;
  amenity_ids: number[];
  description_template: string | null;
};

type Amenity = { id: number; name: string };

// Selecting a template pre-fills every field below via refs (uncontrolled
// inputs, values set imperatively) rather than one useState per field -
// simpler than a ~15-field reducer, and there's no post-submit-reset
// conflict to work around here (unlike CleaningForm.tsx, this form
// redirects away on success instead of resubmitting repeatedly). Every
// pre-filled value stays a normal editable input afterward.
export default function NewListingForm({
  templates,
  amenities,
  action,
}: {
  templates: TemplateOption[];
  amenities: Amenity[];
  action: (prevState: string | undefined, formData: FormData) => Promise<string>;
}) {
  const [message, formAction, pending] = useActionState(action, undefined);
  const [descriptionTemplateText, setDescriptionTemplateText] = useState("");

  const bedroomsRef = useRef<HTMLSelectElement>(null);
  const bathroomsRef = useRef<HTMLSelectElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef<HTMLInputElement>(null);

  const priceRef = useRef<HTMLInputElement>(null);
  const currencyRef = useRef<HTMLInputElement>(null);
  const guestsIncludedRef = useRef<HTMLInputElement>(null);
  const priceForExtraPersonRef = useRef<HTMLInputElement>(null);
  const cleaningFeeRef = useRef<HTMLInputElement>(null);
  const damageDepositRef = useRef<HTMLInputElement>(null);
  const cancellationPolicyRef = useRef<HTMLSelectElement>(null);
  const checkInStartRef = useRef<HTMLInputElement>(null);
  const checkInEndRef = useRef<HTMLInputElement>(null);
  const checkOutRef = useRef<HTMLInputElement>(null);
  const minNightsRef = useRef<HTMLInputElement>(null);
  const maxNightsRef = useRef<HTMLInputElement>(null);
  const instantBookableRef = useRef<HTMLInputElement>(null);
  const houseRulesRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const amenityRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  function applyTemplate(templateId: string) {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    if (priceRef.current) priceRef.current.value = template.price ?? "";
    if (currencyRef.current) currencyRef.current.value = template.currency_code ?? "USD";
    if (guestsIncludedRef.current) {
      guestsIncludedRef.current.value = template.guests_included?.toString() ?? "1";
    }
    if (priceForExtraPersonRef.current) {
      priceForExtraPersonRef.current.value = template.price_for_extra_person ?? "0";
    }
    if (cleaningFeeRef.current) cleaningFeeRef.current.value = template.cleaning_fee ?? "";
    if (damageDepositRef.current) {
      damageDepositRef.current.value = template.refundable_damage_deposit ?? "";
    }
    if (cancellationPolicyRef.current) {
      cancellationPolicyRef.current.value = template.cancellation_policy ?? "";
    }
    if (checkInStartRef.current) checkInStartRef.current.value = template.check_in_time_start ?? "";
    if (checkInEndRef.current) checkInEndRef.current.value = template.check_in_time_end ?? "";
    if (checkOutRef.current) checkOutRef.current.value = template.check_out_time ?? "";
    if (minNightsRef.current) minNightsRef.current.value = template.min_nights?.toString() ?? "";
    if (maxNightsRef.current) maxNightsRef.current.value = template.max_nights?.toString() ?? "";
    if (instantBookableRef.current) instantBookableRef.current.checked = template.instant_bookable;
    if (houseRulesRef.current) houseRulesRef.current.value = template.house_rules ?? "";

    const selectedAmenityIds = new Set(template.amenity_ids);
    amenityRefs.current.forEach((el, id) => {
      el.checked = selectedAmenityIds.has(id);
    });

    setDescriptionTemplateText(template.description_template ?? "");
  }

  function fillDescription(templateText?: string) {
    const text = templateText ?? descriptionTemplateText;
    if (!text) return;

    const bedrooms = bedroomsRef.current?.value ?? "";
    const bathrooms = bathroomsRef.current?.value ?? "";
    const city = cityRef.current?.value ?? "";
    const state = stateRef.current?.value ?? "";
    const amenityNames = amenities
      .filter((a) => amenityRefs.current.get(a.id)?.checked)
      .map((a) => a.name)
      .join(", ");

    const filled = text
      .replaceAll("{bedrooms}", bedrooms)
      .replaceAll("{bathrooms}", bathrooms)
      .replaceAll("{city}", city)
      .replaceAll("{state}", state)
      .replaceAll("{amenities}", amenityNames);

    if (descriptionRef.current) descriptionRef.current.value = filled;
  }

  return (
    <form action={formAction} className="space-y-8">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Property</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="col-span-1 space-y-1 sm:col-span-3">
            <label className="text-sm font-medium text-gray-700">Listing name</label>
            <input name="name" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="col-span-1 space-y-1 sm:col-span-3">
            <label className="text-sm font-medium text-gray-700">Street address</label>
            <input name="address" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">City</label>
            <input ref={cityRef} name="city" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">State</label>
            <input
              ref={stateRef}
              name="state"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Zip code</label>
            <input name="zipcode" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Bedrooms</label>
            <select
              ref={bedroomsRef}
              name="bedrooms_number"
              required
              defaultValue=""
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Select...
              </option>
              {BEDROOM_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Bathrooms</label>
            <select
              ref={bathroomsRef}
              name="bathrooms_number"
              required
              defaultValue=""
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Select...
              </option>
              {BATHROOM_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Apply a template</h2>
        <select
          onChange={(e) => e.target.value && applyTemplate(e.target.value)}
          defaultValue=""
          className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Start blank...</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-gray-400">
          Fills in everything below — pricing, policies, amenities, description. Every field stays
          editable after.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Pricing & policies</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Price / night</label>
            <input
              ref={priceRef}
              name="price"
              type="number"
              step="0.01"
              min={0}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Currency</label>
            <input
              ref={currencyRef}
              name="currency_code"
              defaultValue="USD"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Guests included</label>
            <input
              ref={guestsIncludedRef}
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
              ref={priceForExtraPersonRef}
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
              ref={cleaningFeeRef}
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
              ref={damageDepositRef}
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
              ref={cancellationPolicyRef}
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
              ref={minNightsRef}
              name="min_nights"
              type="number"
              min={1}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Max nights</label>
            <input
              ref={maxNightsRef}
              name="max_nights"
              type="number"
              min={1}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Check-in starts</label>
            <input
              ref={checkInStartRef}
              name="check_in_time_start"
              type="time"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Check-in ends</label>
            <input
              ref={checkInEndRef}
              name="check_in_time_end"
              type="time"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Check-out time</label>
            <input
              ref={checkOutRef}
              name="check_out_time"
              type="time"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5 pt-6">
            <input
              ref={instantBookableRef}
              type="checkbox"
              id="instant_bookable"
              name="instant_bookable"
              defaultChecked
            />
            <label htmlFor="instant_bookable" className="text-sm text-gray-700">
              Instant bookable
            </label>
          </div>
          <div className="col-span-1 space-y-1 sm:col-span-3">
            <label className="text-sm font-medium text-gray-700">House rules</label>
            <textarea
              ref={houseRulesRef}
              name="house_rules"
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Amenities</h2>
        <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto rounded-md border border-gray-200 p-3 sm:grid-cols-3">
          {amenities.map((amenity) => (
            <label key={amenity.id} className="flex items-center gap-1.5 text-sm text-gray-700">
              <input
                type="checkbox"
                name="amenity_ids"
                value={amenity.id}
                ref={(el) => {
                  if (el) amenityRefs.current.set(amenity.id, el);
                  else amenityRefs.current.delete(amenity.id);
                }}
              />
              {amenity.name}
            </label>
          ))}
          {amenities.length === 0 && (
            <p className="col-span-full text-sm text-gray-400">
              Couldn&apos;t load amenities from Hostaway — check credentials on the Settings page.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Description</h2>
          <button
            type="button"
            onClick={() => fillDescription()}
            disabled={!descriptionTemplateText}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Fill from template
          </button>
        </div>
        <textarea
          ref={descriptionRef}
          name="description"
          rows={6}
          placeholder="Pick a template above to auto-fill this, or write your own."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {pending ? "Creating in Hostaway..." : "Create in Hostaway"}
        </button>
        {message && <p className="mt-2 text-sm text-red-600">{message}</p>}
      </div>
    </form>
  );
}
