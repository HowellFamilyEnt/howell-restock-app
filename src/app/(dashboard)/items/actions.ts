"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createItem(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const unit_of_measure = String(formData.get("unit_of_measure") ?? "").trim();
  const central_stock_qty = Number(formData.get("central_stock_qty"));
  const reorder_threshold = Number(formData.get("reorder_threshold"));
  const reorder_qty = Number(formData.get("reorder_qty"));
  const preferred_vendor = String(formData.get("preferred_vendor") ?? "").trim();
  const unit_cost = String(formData.get("unit_cost") ?? "0");

  if (
    !name ||
    !unit_of_measure ||
    !Number.isFinite(central_stock_qty) ||
    !Number.isFinite(reorder_threshold) ||
    !Number.isFinite(reorder_qty)
  ) {
    throw new Error("Missing or invalid item fields.");
  }

  await prisma.item.create({
    data: {
      name,
      category: category || "Uncategorized",
      unit_of_measure,
      central_stock_qty,
      reorder_threshold,
      reorder_qty,
      preferred_vendor: preferred_vendor || null,
      unit_cost,
    },
  });

  revalidatePath("/items");
}
