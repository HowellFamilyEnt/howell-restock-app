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

export async function createWorkOrderAction(propertyId: string) {
  const session = await auth();
  const workOrder = await createWorkOrderForProperty(propertyId, {
    createdBy: session?.user?.id,
  });

  revalidatePath(`/properties/${propertyId}`);
  redirect(`/work-orders/${workOrder.id}`);
}
