"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  createWorkOrderForProperty,
  runDueWorkOrderSweep,
  completeWorkOrderItem,
  sendWorkOrderNow,
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

export async function updateWorkOrderAssignmentAction(workOrderId: string, formData: FormData) {
  const teamMemberId = String(formData.get("assigned_team_member_id") ?? "").trim();

  await prisma.workOrder.update({
    where: { id: workOrderId },
    data: { assigned_team_member_id: teamMemberId || null },
  });

  revalidatePath(`/work-orders/${workOrderId}`);
  revalidatePath("/work-orders");
}

export async function sendWorkOrderNowAction(
  workOrderId: string,
  _prevState: string | undefined,
  _formData: FormData
): Promise<string> {
  const result = await sendWorkOrderNow(workOrderId);
  revalidatePath(`/work-orders/${workOrderId}`);
  revalidatePath("/work-orders");

  if (result.sent) return "Sent.";
  return `Not sent: ${result.errors.join("; ")}`;
}

export async function setWorkOrderStatusAction(workOrderId: string, status: "Open" | "Completed" | "Archived") {
  await prisma.workOrder.update({ where: { id: workOrderId }, data: { status } });
  revalidatePath(`/work-orders/${workOrderId}`);
  revalidatePath("/work-orders");
}

export async function deleteWorkOrderAction(workOrderId: string) {
  await prisma.workOrder.delete({ where: { id: workOrderId } });
  revalidatePath("/work-orders");
  redirect("/work-orders");
}

export async function bulkArchiveWorkOrdersAction(ids: string[]) {
  await prisma.workOrder.updateMany({ where: { id: { in: ids } }, data: { status: "Archived" } });
  revalidatePath("/work-orders");
}

export async function bulkDeleteWorkOrdersAction(ids: string[]) {
  await prisma.workOrder.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/work-orders");
}

export async function bulkSendWorkOrdersAction(ids: string[]): Promise<string> {
  let sent = 0;
  const errors: string[] = [];
  for (const id of ids) {
    const result = await sendWorkOrderNow(id);
    if (result.sent) sent += 1;
    else errors.push(...result.errors);
  }
  revalidatePath("/work-orders");
  let message = `${sent}/${ids.length} sent.`;
  if (errors.length > 0) message += ` Errors: ${errors.slice(0, 3).join("; ")}`;
  return message;
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
