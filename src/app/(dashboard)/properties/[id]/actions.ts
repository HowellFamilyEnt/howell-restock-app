"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createWorkOrderForProperty } from "@/lib/workorders";
import { getSeamApiKey } from "@/lib/settings";
import { createSeamAccessCode, getSeamAccessCode } from "@/lib/seam";
import { zonedTimeToUtc } from "@/lib/calendar";
import { uploadNotePhoto } from "@/lib/storage";

// Refuses to hard-delete a property that has real history (restock
// events, notes, work orders) - only par levels (just config, not
// history) don't block it. Same guard pattern as deleteItem in
// src/app/(dashboard)/items/actions.ts. For a Hostaway-sourced property
// still active in Hostaway, archiving (togglePropertyActive) is the
// right move instead - deleting doesn't stick if Sync from Hostaway
// runs again while the listing still exists there.
export async function deleteProperty(
  propertyId: string,
  _prevState: string | undefined,
  _formData: FormData
): Promise<string> {
  const [restockCount, noteCount, workOrderCount] = await Promise.all([
    prisma.restockEvent.count({ where: { property_id: propertyId } }),
    prisma.note.count({ where: { property_id: propertyId } }),
    prisma.workOrder.count({ where: { property_id: propertyId } }),
  ]);

  if (restockCount > 0 || noteCount > 0 || workOrderCount > 0) {
    return "Can't delete — this property has restock history, notes, or work orders. Archive it instead to keep that history intact.";
  }

  await prisma.property.delete({ where: { id: propertyId } });
  revalidatePath("/properties");
  redirect("/properties");
}

export async function setParLevel(propertyId: string, itemId: string, formData: FormData) {
  const target_qty = Number(formData.get("target_qty"));
  if (!Number.isFinite(target_qty) || target_qty < 0) {
    throw new Error("Invalid target quantity.");
  }

  await prisma.parLevel.upsert({
    where: { property_id_item_id: { property_id: propertyId, item_id: itemId } },
    update: { target_qty },
    create: { property_id: propertyId, item_id: itemId, target_qty },
  });

  revalidatePath(`/properties/${propertyId}`);
}

export async function updatePropertyDetails(propertyId: string, formData: FormData) {
  const address = String(formData.get("address") ?? "").trim();
  const bedroomsRaw = String(formData.get("bedrooms") ?? "").trim();
  const bathroomsRaw = String(formData.get("bathrooms") ?? "").trim();
  const bedrooms = bedroomsRaw ? Number(bedroomsRaw) : null;
  const bathrooms = bathroomsRaw ? Number(bathroomsRaw) : null;

  if (bedrooms !== null && !Number.isFinite(bedrooms)) {
    throw new Error("Invalid bedrooms value.");
  }
  if (bathrooms !== null && !Number.isFinite(bathrooms)) {
    throw new Error("Invalid bathrooms value.");
  }

  await prisma.property.update({
    where: { id: propertyId },
    data: { address: address || null, bedrooms, bathrooms },
  });

  revalidatePath("/properties");
  revalidatePath(`/properties/${propertyId}`);
}

export async function updateMasterDoorCode(propertyId: string, formData: FormData) {
  const master_door_code = String(formData.get("master_door_code") ?? "").trim();

  await prisma.property.update({
    where: { id: propertyId },
    data: { master_door_code: master_door_code || null },
  });

  revalidatePath(`/properties/${propertyId}`);
}

export async function updateGeneralNotes(propertyId: string, formData: FormData) {
  const general_notes = String(formData.get("general_notes") ?? "").trim();

  await prisma.property.update({
    where: { id: propertyId },
    data: { general_notes: general_notes || null },
  });

  revalidatePath(`/properties/${propertyId}`);
}

// Guest-facing fields shown on the guest portal (src/app/guest/[token]/page.tsx)
// - deliberately separate from updateGeneralNotes above, which is internal-only.
export async function updateGuestPortalInfo(propertyId: string, formData: FormData) {
  const wifi_name = String(formData.get("wifi_name") ?? "").trim();
  const wifi_password = String(formData.get("wifi_password") ?? "").trim();
  const guest_checkin_instructions = String(formData.get("guest_checkin_instructions") ?? "").trim();
  const house_rules = String(formData.get("house_rules") ?? "").trim();
  const parking_instructions = String(formData.get("parking_instructions") ?? "").trim();

  await prisma.property.update({
    where: { id: propertyId },
    data: {
      wifi_name: wifi_name || null,
      wifi_password: wifi_password || null,
      guest_checkin_instructions: guest_checkin_instructions || null,
      house_rules: house_rules || null,
      parking_instructions: parking_instructions || null,
    },
  });

  revalidatePath(`/properties/${propertyId}`);
}

// Single exterior/building photo shown at the top of the guest portal -
// unlike the numbered CheckinPhoto steps below, there's only ever one of
// these, so uploading a new one replaces rather than appends.
export async function updateBuildingPhoto(
  propertyId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return "Choose a photo first.";

  try {
    const uploaded = await uploadNotePhoto(file);
    await prisma.property.update({
      where: { id: propertyId },
      data: { building_photo_url: uploaded.url },
    });
  } catch (error) {
    return error instanceof Error ? error.message : "Upload failed.";
  }

  revalidatePath(`/properties/${propertyId}`);
  return "";
}

export async function removeBuildingPhoto(propertyId: string) {
  await prisma.property.update({
    where: { id: propertyId },
    data: { building_photo_url: null },
  });
  revalidatePath(`/properties/${propertyId}`);
}

// Captioned check-in-instruction photos shown as a numbered sequence on
// the guest portal, under Building & unit access. Reuses uploadNotePhoto
// (src/lib/storage.ts) - it's generic despite the name, already the
// shared upload path for work-order/cleaning note photos.
export async function addCheckinPhoto(
  propertyId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string> {
  const caption = String(formData.get("caption") ?? "").trim();
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return "Choose a photo first.";

  try {
    const uploaded = await uploadNotePhoto(file);
    const highest = await prisma.checkinPhoto.aggregate({
      where: { property_id: propertyId },
      _max: { order: true },
    });
    await prisma.checkinPhoto.create({
      data: {
        property_id: propertyId,
        url: uploaded.url,
        caption: caption || null,
        order: (highest._max.order ?? -1) + 1,
      },
    });
  } catch (error) {
    return error instanceof Error ? error.message : "Upload failed.";
  }

  revalidatePath(`/properties/${propertyId}`);
  return "";
}

export async function updateCheckinPhotoCaption(photoId: string, propertyId: string, formData: FormData) {
  const caption = String(formData.get("caption") ?? "").trim();
  await prisma.checkinPhoto.update({ where: { id: photoId }, data: { caption: caption || null } });
  revalidatePath(`/properties/${propertyId}`);
}

export async function deleteCheckinPhoto(photoId: string, propertyId: string) {
  await prisma.checkinPhoto.delete({ where: { id: photoId } });
  revalidatePath(`/properties/${propertyId}`);
}

// Resequences by swapping the moved step's `order` with its neighbor's,
// rather than reindexing the whole list.
export async function moveCheckinPhoto(photoId: string, propertyId: string, direction: "up" | "down") {
  const photos = await prisma.checkinPhoto.findMany({
    where: { property_id: propertyId },
    orderBy: { order: "asc" },
  });
  const index = photos.findIndex((p) => p.id === photoId);
  if (index === -1) return;

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= photos.length) return;

  const current = photos[index];
  const swapWith = photos[swapIndex];
  await prisma.$transaction([
    prisma.checkinPhoto.update({ where: { id: current.id }, data: { order: swapWith.order } }),
    prisma.checkinPhoto.update({ where: { id: swapWith.id }, data: { order: current.order } }),
  ]);

  revalidatePath(`/properties/${propertyId}`);
}

// Same numbered/captioned-steps pattern as the check-in photos above,
// scoped to the guest portal's Parking section instead.
export async function addParkingPhoto(
  propertyId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string> {
  const caption = String(formData.get("caption") ?? "").trim();
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return "Choose a photo first.";

  try {
    const uploaded = await uploadNotePhoto(file);
    const highest = await prisma.parkingPhoto.aggregate({
      where: { property_id: propertyId },
      _max: { order: true },
    });
    await prisma.parkingPhoto.create({
      data: {
        property_id: propertyId,
        url: uploaded.url,
        caption: caption || null,
        order: (highest._max.order ?? -1) + 1,
      },
    });
  } catch (error) {
    return error instanceof Error ? error.message : "Upload failed.";
  }

  revalidatePath(`/properties/${propertyId}`);
  return "";
}

export async function updateParkingPhotoCaption(photoId: string, propertyId: string, formData: FormData) {
  const caption = String(formData.get("caption") ?? "").trim();
  await prisma.parkingPhoto.update({ where: { id: photoId }, data: { caption: caption || null } });
  revalidatePath(`/properties/${propertyId}`);
}

export async function deleteParkingPhoto(photoId: string, propertyId: string) {
  await prisma.parkingPhoto.delete({ where: { id: photoId } });
  revalidatePath(`/properties/${propertyId}`);
}

export async function moveParkingPhoto(photoId: string, propertyId: string, direction: "up" | "down") {
  const photos = await prisma.parkingPhoto.findMany({
    where: { property_id: propertyId },
    orderBy: { order: "asc" },
  });
  const index = photos.findIndex((p) => p.id === photoId);
  if (index === -1) return;

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= photos.length) return;

  const current = photos[index];
  const swapWith = photos[swapIndex];
  await prisma.$transaction([
    prisma.parkingPhoto.update({ where: { id: current.id }, data: { order: swapWith.order } }),
    prisma.parkingPhoto.update({ where: { id: swapWith.id }, data: { order: current.order } }),
  ]);

  revalidatePath(`/properties/${propertyId}`);
}

export async function updateAssignedTeamMember(propertyId: string, formData: FormData) {
  const teamMemberId = String(formData.get("assignedTeamMemberId") ?? "").trim();

  await prisma.property.update({
    where: { id: propertyId },
    data: { assignedTeamMemberId: teamMemberId || null },
  });

  revalidatePath("/properties");
  revalidatePath(`/properties/${propertyId}`);
}

export async function updateLicenseInfo(propertyId: string, formData: FormData) {
  const license_owner = String(formData.get("license_owner") ?? "").trim();
  const license_number = String(formData.get("license_number") ?? "").trim();
  const issueDateRaw = String(formData.get("license_issue_date") ?? "").trim();
  const expirationDateRaw = String(formData.get("license_expiration_date") ?? "").trim();

  const license_issue_date = issueDateRaw ? new Date(`${issueDateRaw}T00:00:00Z`) : null;
  const license_expiration_date = expirationDateRaw ? new Date(`${expirationDateRaw}T00:00:00Z`) : null;

  const current = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { license_expiration_date: true, license_number: true },
  });
  const expirationChanged =
    current?.license_expiration_date?.getTime() !== license_expiration_date?.getTime();
  const numberChanged = (current?.license_number ?? null) !== (license_number || null);

  await prisma.property.update({
    where: { id: propertyId },
    data: {
      license_owner: license_owner || null,
      license_number: license_number || null,
      // license_type isn't on the Licenses page's grid form, only the
      // property detail page's - only touch it when actually submitted,
      // so saving from the grid never silently wipes it.
      ...(formData.has("license_type")
        ? { license_type: String(formData.get("license_type") ?? "").trim() || null }
        : {}),
      license_issue_date,
      license_expiration_date,
      // Renewing the license (a new expiration date) should be able to
      // trigger a fresh alert as the new date approaches - see
      // src/lib/licenses.ts.
      ...(expirationChanged ? { license_alert_sent_for: null } : {}),
      // A locally-edited number or expiration date is no longer verified
      // against Hostaway until the next "Check against Hostaway" run.
      ...(expirationChanged || numberChanged ? { license_hostaway_confirmed_at: null } : {}),
    },
  });

  revalidatePath("/properties");
  revalidatePath("/licenses");
  revalidatePath(`/properties/${propertyId}`);
}

// Bound-toggle, same pattern as togglePropertyActive in ../actions.ts -
// per-property half of the guest-automation kill switch (the other half
// is IntegrationSettings.guest_automation_enabled on the Settings page).
export async function toggleGuestAutomationForProperty(propertyId: string, next: boolean) {
  await prisma.property.update({
    where: { id: propertyId },
    data: { guest_automation_enabled: next },
  });

  revalidatePath(`/properties/${propertyId}`);
}

// One-off code for a 3rd-party vendor (HVAC, etc.) - not the cleaning
// crew, who already have their own access. Deliberately not modeled as a
// WorkOrder: there's no par-level/checklist concept here, just a start
// time, end time, and a label. Hour granularity only (matches
// zonedTimeToUtc and the form's date+hour inputs, rather than a
// datetime-local input that would imply minute precision this doesn't
// actually have). Start/end are entered (and interpreted) in the
// property's own local timezone, same as guest codes - falls back to UTC
// for a property with no timezone on file (non-Hostaway properties never
// get one from the sync).
export async function issueVendorAccessCode(propertyId: string, _prevState: string | undefined, formData: FormData): Promise<string> {
  const label = String(formData.get("label") ?? "").trim();
  const startsDate = String(formData.get("starts_date") ?? "").trim();
  const startsHour = Number(formData.get("starts_hour"));
  const endsDate = String(formData.get("ends_date") ?? "").trim();
  const endsHour = Number(formData.get("ends_hour"));

  if (!label) return "Give it a label (e.g. \"HVAC\").";
  if (!startsDate || !endsDate) return "Pick a start and end date.";
  if (!Number.isInteger(startsHour) || !Number.isInteger(endsHour)) return "Pick a start and end hour.";

  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) return "Property not found.";
  if (!property.smart_lock_id) return "No smart lock assigned to this property yet.";

  const apiKey = await getSeamApiKey();
  if (!apiKey) return "No Seam API key configured on the Settings page.";

  const timezone = property.timezone ?? "UTC";
  const startsAt = zonedTimeToUtc(startsDate, startsHour, timezone);
  const endsAt = zonedTimeToUtc(endsDate, endsHour, timezone);

  if (endsAt <= startsAt) return "End time must be after the start time.";

  try {
    // No isOneTimeUse here - confirmed live 2026-09-18: Seam never
    // allows is_one_time_use combined with ends_at, on any lock. A
    // vendor's window being scheduled is the security property that
    // actually matters for a visit (they can only get in during their
    // appointment), so that's what's kept; the code just works any
    // number of times within that window rather than exactly once. This
    // also means it stays a normal, deletable code if a visit is
    // cancelled - the one-time-use alternative would require an offline
    // code, which Seam won't let you remove once set.
    const accessCode = await createSeamAccessCode(apiKey, {
      deviceId: property.smart_lock_id,
      name: label,
      startsAt,
      endsAt,
    });

    await prisma.guestAccessCode.create({
      data: {
        property_id: propertyId,
        purpose: "vendor",
        label,
        starts_at: startsAt,
        ends_at: endsAt,
        seam_access_code_id: accessCode.access_code_id,
        code: accessCode.code,
        status: accessCode.display_status ?? accessCode.status,
      },
    });
  } catch (error) {
    return error instanceof Error ? error.message : "Seam request failed.";
  }

  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/guest-access-codes");
  return "Code issued — see it on the Guest Access Codes page.";
}

// A quick one-off code to hand out on the spot (a showing, a delivery,
// etc.) - one-time-use on the lock itself, and also time-boxed to 2 hours
// so it self-expires even if never used. The 2-hour window doubles as
// how long the property page keeps showing it in the field below; after
// that it's just gone from view, matching "visible for 2 hours then I
// can go away until we issue a new one" rather than needing a manual
// dismiss step.
const ONE_TIME_CODE_VISIBLE_MS = 2 * 60 * 60 * 1000;

export async function issueOneTimeCode(propertyId: string): Promise<string> {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) return "Property not found.";
  if (!property.smart_lock_id) return "No smart lock assigned to this property yet.";

  const apiKey = await getSeamApiKey();
  if (!apiKey) return "No Seam API key configured on the Settings page.";

  const startsAt = new Date();
  // The 2-hour window here is purely how long OUR UI keeps showing the
  // code (starts_at/ends_at on our own row below) - it's deliberately
  // never sent to Seam's create call, since is_one_time_use can never
  // combine with a window on any lock.
  const visibleUntil = new Date(startsAt.getTime() + ONE_TIME_CODE_VISIBLE_MS);

  try {
    // Lock brands disagree on this, confirmed live against two real
    // locks on 2026-09-18: an Igloohome device rejects is_one_time_use
    // outright unless the code is also offline ("Cannot set
    // is_one_time_use for online codes"), while a Kwikset device
    // rejects offline codes entirely ("Offline Access codes not
    // supported on device"). Rather than guess per manufacturer, try
    // the plain way first and only retry with is_offline_access_code if
    // that specific error comes back.
    let accessCode;
    try {
      accessCode = await createSeamAccessCode(apiKey, {
        deviceId: property.smart_lock_id,
        name: "HFE-OneTime",
        isOneTimeUse: true,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Cannot set is_one_time_use for online codes")) {
        accessCode = await createSeamAccessCode(apiKey, {
          deviceId: property.smart_lock_id,
          name: "HFE-OneTime",
          isOneTimeUse: true,
          isOfflineAccessCode: true,
        });
      } else {
        throw error;
      }
    }

    // An offline code (the fallback path above) doesn't get its PIN
    // assigned synchronously - poll briefly rather than trusting a null
    // `code` on the create response.
    for (let attempt = 0; attempt < 6 && !accessCode.code; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      accessCode = await getSeamAccessCode(apiKey, accessCode.access_code_id);
    }

    await prisma.guestAccessCode.create({
      data: {
        property_id: propertyId,
        purpose: "onetime",
        label: "One-time code",
        starts_at: startsAt,
        ends_at: visibleUntil,
        seam_access_code_id: accessCode.access_code_id,
        code: accessCode.code,
        status: accessCode.display_status ?? accessCode.status,
        // A rare miss here (PIN still not assigned after ~18s) isn't
        // fatal - the check-lock-health cron's repair pass will fill in
        // the code and confirm it the next time it runs.
        error: accessCode.code ? null : "Still assigning a code - check back in a minute.",
      },
    });
  } catch (error) {
    // Confirmed live 2026-09-18 against a real Kwikset lock: some
    // devices reject is_one_time_use both with and without
    // is_offline_access_code (the fallback above), meaning they don't
    // support one-time-use codes via Seam at all - not fixable from
    // here. Give a clear next step instead of a raw Seam string.
    if (error instanceof Error && error.message.includes("Offline Access codes not supported on device")) {
      return "This lock doesn't support one-time-use codes at all. Use \"Add code\" on this lock's details page instead - a regular code you delete manually once it's no longer needed.";
    }
    return error instanceof Error ? error.message : "Seam request failed.";
  }

  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/guest-access-codes");
  return "";
}

export async function createWorkOrderAction(propertyId: string, formData: FormData) {
  const session = await auth();
  const dueDateRaw = String(formData.get("due_date") ?? "").trim();
  const scheduledFor = dueDateRaw ? new Date(`${dueDateRaw}T00:00:00Z`) : undefined;

  const workOrder = await createWorkOrderForProperty(propertyId, {
    createdBy: session?.user?.id,
    scheduledFor,
  });

  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/calendar");
  redirect(`/work-orders/${workOrder.id}`);
}
