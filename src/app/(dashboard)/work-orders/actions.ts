"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  createWorkOrderForProperty,
  runDueWorkOrderSweep,
  completeWorkOrderItem,
  type SweepResult,
} from "@/lib/workorders";

export async function completeWorkOrderItemAction(
  workOrderId: string,
  workOrderItemId: string,
  formData: FormData
) {
  const session = await auth();
  const qtyOnSiteRaw = String(formData.get("qty_on_site") ?? "").trim();
  const qtyAddedRaw = String(formData.get("qty_added") ?? "").trim();
  const qtyOnSite = qtyOnSiteRaw ? Number(qtyOnSiteRaw) : null;
  const qtyAdded = qtyAddedRaw ? Number(qtyAddedRaw) : null;

  if (qtyOnSite !== null && !Number.isFinite(qtyOnSite)) {
    throw new Error("Invalid quantity on site.");
  }
  if (qtyAdded !== null && !Number.isFinite(qtyAdded)) {
    throw new Error("Invalid quantity added.");
  }

  await completeWorkOrderItem(workOrderItemId, {
    qtyOnSite,
    qtyAdded,
    loggedByUserId: session?.user?.id ?? null,
  });

  revalidatePath(`/work-orders/${workOrderId}`);
  revalidatePath("/work-orders");
  revalidatePath("/restock");
  revalidatePath("/items");
}

export async function createWorkOrderForPropertyAction(formData: FormData) {
  const propertyId = String(formData.get("property_id") ?? "");
  if (!propertyId) throw new Error("Pick a property.");

  const session = await auth();
  const workOrder = await createWorkOrderForProperty(propertyId, { createdBy: session?.user?.id });

  revalidatePath("/work-orders");
  redirect(`/work-orders/${workOrder.id}`);
}

export async function runSweepAction(
  _prevState: string | undefined,
  _formData: FormData
): Promise<string> {
  const result: SweepResult = await runDueWorkOrderSweep();
  revalidatePath("/work-orders");

  const parts = [`${result.created} work order${result.created === 1 ? "" : "s"} created`];
  parts.push(`${result.sent} sent`);
  if (result.skippedNoTeamMember > 0) {
    parts.push(`${result.skippedNoTeamMember} skipped (no team member assigned)`);
  }
  let message = parts.join(", ") + ".";
  if (result.errors.length > 0) {
    message += ` Errors: ${result.errors.slice(0, 3).join("; ")}`;
  }
  return message;
}
