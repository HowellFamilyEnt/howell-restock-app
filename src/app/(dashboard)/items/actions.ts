"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ROOM_GROUP_ORDER } from "@/lib/roomGroups";

function readItemFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const unit_of_measure = String(formData.get("unit_of_measure") ?? "").trim();
  const central_stock_qty = Number(formData.get("central_stock_qty"));
  const reorder_threshold = Number(formData.get("reorder_threshold"));
  const reorder_qty = Number(formData.get("reorder_qty"));
  const preferred_vendor = String(formData.get("preferred_vendor") ?? "").trim();
  const unit_cost = String(formData.get("unit_cost") ?? "0");
  const room_groups = formData.getAll("room_groups").map(String).filter((g) =>
    (ROOM_GROUP_ORDER as readonly string[]).includes(g)
  );

  if (
    !name ||
    !unit_of_measure ||
    !Number.isFinite(central_stock_qty) ||
    !Number.isFinite(reorder_threshold) ||
    !Number.isFinite(reorder_qty)
  ) {
    throw new Error("Missing or invalid item fields.");
  }

  return {
    name,
    category: category || "Uncategorized",
    unit_of_measure,
    central_stock_qty,
    reorder_threshold,
    reorder_qty,
    preferred_vendor: preferred_vendor || null,
    unit_cost,
    room_groups,
  };
}

export async function createItem(formData: FormData) {
  await prisma.item.create({ data: readItemFields(formData) });
  revalidatePath("/items");
}

export async function updateItem(itemId: string, formData: FormData) {
  await prisma.item.update({
    where: { id: itemId },
    data: readItemFields(formData),
  });

  revalidatePath("/items");
  revalidatePath(`/items/${itemId}`);
}

export async function toggleItemActive(itemId: string, next: boolean) {
  await prisma.item.update({ where: { id: itemId }, data: { active: next } });
  revalidatePath("/items");
  revalidatePath(`/items/${itemId}`);
}

export async function deleteItem(
  itemId: string,
  _prevState: string | undefined,
  _formData: FormData
): Promise<string> {
  const [restockCount, parLevelCount, workOrderItemCount] = await Promise.all([
    prisma.restockEvent.count({ where: { item_id: itemId } }),
    prisma.parLevel.count({ where: { item_id: itemId } }),
    prisma.workOrderItem.count({ where: { item_id: itemId } }),
  ]);

  if (restockCount > 0 || parLevelCount > 0 || workOrderItemCount > 0) {
    return "Can't delete — this item has restock history, par levels, or work order references. Deactivate it instead.";
  }

  await prisma.item.delete({ where: { id: itemId } });
  revalidatePath("/items");
  redirect("/items");
}
