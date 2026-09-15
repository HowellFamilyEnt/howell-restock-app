"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createWorkOrderForProperty } from "@/lib/workorders";

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
