"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { completeWorkOrderItem } from "@/lib/workorders";

// Public, unauthenticated action reachable only via a work order's
// unguessable share_token - see src/app/wo/[token]/page.tsx. Looks up the
// work order item by token + id together so one token can never be used to
// act on a different work order's rows.
export async function completePublicWorkOrderItemAction(
  token: string,
  workOrderItemId: string,
  formData: FormData
) {
  const workOrder = await prisma.workOrder.findUnique({
    where: { share_token: token },
    include: { assignedTeamMember: true },
  });
  if (!workOrder) throw new Error("Work order not found.");

  const workOrderItem = await prisma.workOrderItem.findUnique({ where: { id: workOrderItemId } });
  if (!workOrderItem || workOrderItem.work_order_id !== workOrder.id) {
    throw new Error("Item not found on this work order.");
  }

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
    loggedByName: workOrder.assignedTeamMember?.name ?? "Work order link",
  });

  revalidatePath(`/wo/${token}`);
}
