"use server";

import { redirect } from "next/navigation";
import { createListingFromInput } from "@/lib/listings";

export async function createHostawayListingAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string> {
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const zipcode = String(formData.get("zipcode") ?? "").trim();
  const bedroomsNumber = Number(formData.get("bedrooms_number"));
  const bathroomsNumber = Number(formData.get("bathrooms_number"));
  const price = Number(formData.get("price"));
  const currencyCode = String(formData.get("currency_code") ?? "").trim() || "USD";
  const guestsIncludedRaw = Number(formData.get("guests_included"));
  const priceForExtraPersonRaw = Number(formData.get("price_for_extra_person"));
  const cancellationPolicy = String(formData.get("cancellation_policy") ?? "").trim();
  const checkInTimeStart = String(formData.get("check_in_time_start") ?? "").trim();
  const checkInTimeEnd = String(formData.get("check_in_time_end") ?? "").trim();
  const checkOutTime = String(formData.get("check_out_time") ?? "").trim();
  const minNightsRaw = String(formData.get("min_nights") ?? "").trim();
  const maxNightsRaw = String(formData.get("max_nights") ?? "").trim();
  const instantBookable = formData.get("instant_bookable") === "on";
  const cleaningFeeRaw = String(formData.get("cleaning_fee") ?? "").trim();
  const damageDepositRaw = String(formData.get("refundable_damage_deposit") ?? "").trim();
  const houseRules = String(formData.get("house_rules") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const amenityIds = formData
    .getAll("amenity_ids")
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n));

  if (!name || !address || !Number.isFinite(bedroomsNumber) || !Number.isFinite(bathroomsNumber)) {
    return "Name, address, bedrooms, and bathrooms are required.";
  }
  if (!Number.isFinite(price) || price <= 0) {
    return "A nightly price is required.";
  }

  let propertyId: string;
  try {
    const result = await createListingFromInput({
      name,
      address,
      city: city || null,
      state: state || null,
      zipcode: zipcode || null,
      bedroomsNumber,
      bathroomsNumber,
      price,
      currencyCode,
      guestsIncluded: Number.isFinite(guestsIncludedRaw) ? guestsIncludedRaw : 1,
      priceForExtraPerson: Number.isFinite(priceForExtraPersonRaw) ? priceForExtraPersonRaw : 0,
      cancellationPolicy: cancellationPolicy || null,
      checkInTimeStart: checkInTimeStart || null,
      checkInTimeEnd: checkInTimeEnd || null,
      checkOutTime: checkOutTime || null,
      minNights: minNightsRaw ? Number(minNightsRaw) : null,
      maxNights: maxNightsRaw ? Number(maxNightsRaw) : null,
      instantBookable,
      cleaningFee: cleaningFeeRaw ? Number(cleaningFeeRaw) : null,
      refundableDamageDeposit: damageDepositRaw ? Number(damageDepositRaw) : null,
      houseRules: houseRules || null,
      description: description || null,
      amenityIds,
    });
    propertyId = result.propertyId;
  } catch (error) {
    return error instanceof Error ? `Couldn't create listing: ${error.message}` : "Couldn't create listing.";
  }

  redirect(`/properties/${propertyId}`);
}
