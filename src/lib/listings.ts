import { prisma } from "@/lib/prisma";
import { getHostawayCredentials } from "@/lib/settings";
import { getAccessToken, createHostawayListing, type CreateListingInput } from "@/lib/hostaway";

// Creates the listing in Hostaway (as an unpublished draft - see
// createHostawayListing's doc comment), then immediately creates a
// normal Property row for it, matching the shape syncHostawayListings
// creates for listings discovered via the regular sync (see
// src/lib/hostaway.ts's syncHostawayListings) - so it works everywhere
// else in the app (par levels, work orders, licenses) right away.
export async function createListingFromInput(
  input: CreateListingInput
): Promise<{ propertyId: string }> {
  const credentials = await getHostawayCredentials();
  if (!credentials) {
    throw new Error(
      "No Hostaway credentials configured. Add them on the Settings page, or set HOSTAWAY_ACCOUNT_ID and HOSTAWAY_API_KEY as environment variables."
    );
  }

  const token = await getAccessToken(credentials.accountId, credentials.apiKey);
  const { id } = await createHostawayListing(token, input);

  const fullAddress = [input.address, input.city, input.state, input.zipcode]
    .filter((part) => part && part.trim())
    .join(", ");

  const property = await prisma.property.create({
    data: {
      name_address: input.name,
      address: fullAddress || null,
      bedrooms: input.bedroomsNumber,
      bathrooms: input.bathroomsNumber,
      type: "STR",
      unit_count: 1,
      assigned_cleaning_team: null,
      restock_frequency_days: 14,
      urgent_restock_requested: false,
      active: true,
      hostaway_listing_id: String(id),
      source: "Hostaway",
    },
  });

  return { propertyId: property.id };
}
