"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { completeWorkOrderItem } from "@/lib/workorders";
import { addNoteToWorkOrder } from "@/lib/notes";
import type { NoteCategory } from "@prisma/client";

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

// Public, unauthenticated - the token itself is the access control. Looked
// up fresh here (not passed from the page) so a stale/forged property id
// can never be paired with someone else's token.
export async function addPublicWorkOrderNoteAction(
  token: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string> {
  const workOrder = await prisma.workOrder.findUnique({ where: { share_token: token } });
  if (!workOrder) throw new Error("Work order not found.");

  const category = String(formData.get("category") ?? "General") as NoteCategory;
  const description = String(formData.get("description") ?? "");
  const photoFiles = formData.getAll("photos").filter((f): f is File => f instanceof File);

  const { uploadErrors } = await addNoteToWorkOrder({
    workOrderId: workOrder.id,
    propertyId: workOrder.property_id,
    category,
    description,
    photoFiles,
  });

  revalidatePath(`/wo/${token}`);

  if (uploadErrors.length > 0) {
    return `Note saved, but: ${uploadErrors.join("; ")}`;
  }
  return "Note added.";
}
