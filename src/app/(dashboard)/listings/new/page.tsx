import { prisma } from "@/lib/prisma";
import { getAmenitiesOrEmpty } from "@/lib/hostaway";
import { createHostawayListingAction } from "./actions";
import NewListingForm, { type TemplateOption } from "./NewListingForm";

export default async function NewListingPage() {
  const [templates, amenities] = await Promise.all([
    prisma.listingTemplate.findMany({ orderBy: { name: "asc" } }),
    getAmenitiesOrEmpty(),
  ]);

  const templateOptions: TemplateOption[] = templates.map((t) => ({
    id: t.id,
    name: t.name,
    currency_code: t.currency_code,
    price: t.price?.toString() ?? null,
    price_for_extra_person: t.price_for_extra_person?.toString() ?? null,
    guests_included: t.guests_included,
    cleaning_fee: t.cleaning_fee?.toString() ?? null,
    refundable_damage_deposit: t.refundable_damage_deposit?.toString() ?? null,
    cancellation_policy: t.cancellation_policy,
    check_in_time_start: t.check_in_time_start,
    check_in_time_end: t.check_in_time_end,
    check_out_time: t.check_out_time,
    min_nights: t.min_nights,
    max_nights: t.max_nights,
    instant_bookable: t.instant_bookable,
    house_rules: t.house_rules,
    amenity_ids: t.amenity_ids,
    description_template: t.description_template,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">New Listing</h1>
        <p className="text-sm text-gray-500">
          Creates the listing in Hostaway as a draft — it won&apos;t be exported/published to Airbnb or
          any other channel until you add photos and publish it yourself in Hostaway.
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Amenity sub-types (e.g. Air conditioning: Central vs. window unit) aren&apos;t available
          through Hostaway&apos;s API — set those manually in Hostaway&apos;s editor along with photos.
        </p>
      </div>

      <NewListingForm
        templates={templateOptions}
        amenities={amenities}
        action={createHostawayListingAction}
      />
    </div>
  );
}
