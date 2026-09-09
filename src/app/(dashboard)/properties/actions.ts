"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { PropertyType } from "@prisma/client";

export async function createProperty(formData: FormData) {
  const name_address = String(formData.get("name_address") ?? "").trim();
  const type = String(formData.get("type") ?? "") as PropertyType;
  const unit_count = Number(formData.get("unit_count"));
  const assigned_cleaning_team = String(formData.get("assigned_cleaning_team") ?? "").trim();
  const restock_frequency_days = Number(formData.get("restock_frequency_days"));

  if (!name_address || !type || !Number.isFinite(unit_count) || !Number.isFinite(restock_frequency_days)) {
    throw new Error("Missing or invalid property fields.");
  }

  await prisma.property.create({
    data: {
      name_address,
      type,
      unit_count,
      assigned_cleaning_team: assigned_cleaning_team || null,
      restock_frequency_days,
      source: "Manual",
    },
  });

  revalidatePath("/properties");
}

export async function toggleUrgent(propertyId: string, next: boolean) {
  await prisma.property.update({
    where: { id: propertyId },
    data: { urgent_restock_requested: next },
  });
  revalidatePath("/properties");
}

export async function togglePropertyActive(propertyId: string, next: boolean) {
  await prisma.property.update({
    where: { id: propertyId },
    data: { active: next },
  });
  revalidatePath("/properties");
}
