"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function logRestock(formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated.");

  const property_id = String(formData.get("property_id") ?? "");
  const item_id = String(formData.get("item_id") ?? "");
  const dateInput = String(formData.get("date") ?? "");
  const qty_delivered = Number(formData.get("qty_delivered"));
  const urgent_flag = formData.get("urgent_flag") === "on";
  const notes = String(formData.get("notes") ?? "").trim();

  if (!property_id || !item_id || !dateInput || !Number.isFinite(qty_delivered) || qty_delivered <= 0) {
    throw new Error("Missing or invalid restock fields.");
  }

  await prisma.$transaction([
    prisma.restockEvent.create({
      data: {
        property_id,
        item_id,
        date: new Date(dateInput),
        qty_delivered,
        logged_by: userId,
        urgent_flag,
        notes: notes || null,
      },
    }),
    prisma.item.update({
      where: { id: item_id },
      data: { central_stock_qty: { decrement: qty_delivered } },
    }),
  ]);

  revalidatePath("/restock");
  revalidatePath("/items");
}
