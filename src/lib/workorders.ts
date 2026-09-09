import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendWorkOrderLink } from "@/lib/notify";
import { addUtcDays } from "@/lib/calendar";

function baseUrl(): string {
  return process.env.APP_URL || "http://localhost:3000";
}

export function workOrderLink(shareToken: string): string {
  return `${baseUrl()}/wo/${shareToken}`;
}

export async function createWorkOrderForProperty(
  propertyId: string,
  options: { createdBy?: string; scheduledFor?: Date } = {}
) {
  const parLevels = await prisma.parLevel.findMany({
    where: { property_id: propertyId, item: { active: true } },
  });

  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw new Error("Property not found.");

  const shareToken = crypto.randomBytes(24).toString("hex");

  const workOrder = await prisma.workOrder.create({
    data: {
      property_id: propertyId,
      assigned_team_member_id: property.assignedTeamMemberId,
      share_token: shareToken,
      scheduled_for: options.scheduledFor ?? null,
      created_by: options.createdBy ?? null,
      items: {
        create: parLevels.map((pl) => ({
          item_id: pl.item_id,
          qty_needed: pl.target_qty,
        })),
      },
    },
    include: { items: true, assignedTeamMember: true, property: true },
  });

  return workOrder;
}

export type CompleteWorkOrderItemInput = {
  qtyOnSite: number | null;
  qtyAdded: number | null;
  loggedByUserId?: string | null;
  loggedByName?: string | null;
};

// Shared by the admin work-order page (src/app/(dashboard)/work-orders) and
// the public token-based crew link (src/app/wo/[token]) so both flows apply
// the exact same rules: idempotent (a second submit on an already-completed
// row is a no-op, never double-logs), only creates a RestockEvent /
// decrements central stock when a positive qty_added was actually entered,
// and auto-closes the parent WorkOrder once every row is done.
export async function completeWorkOrderItem(
  workOrderItemId: string,
  input: CompleteWorkOrderItemInput
) {
  const workOrderItem = await prisma.workOrderItem.findUnique({
    where: { id: workOrderItemId },
    include: { workOrder: true },
  });
  if (!workOrderItem) throw new Error("Work order item not found.");
  if (workOrderItem.completed) return { alreadyCompleted: true };

  const workOrderId = workOrderItem.work_order_id;

  await prisma.$transaction(async (tx) => {
    await tx.workOrderItem.update({
      where: { id: workOrderItemId },
      data: {
        qty_on_site: input.qtyOnSite,
        qty_added: input.qtyAdded,
        completed: true,
        completedAt: new Date(),
      },
    });

    if (input.qtyAdded && input.qtyAdded > 0) {
      await tx.restockEvent.create({
        data: {
          property_id: workOrderItem.workOrder.property_id,
          item_id: workOrderItem.item_id,
          date: new Date(),
          qty_delivered: input.qtyAdded,
          logged_by: input.loggedByUserId ?? null,
          logged_by_name: input.loggedByName ?? null,
          notes: `Via work order ${workOrderId}`,
        },
      });
      await tx.item.update({
        where: { id: workOrderItem.item_id },
        data: { central_stock_qty: { decrement: input.qtyAdded } },
      });
    }

    const remaining = await tx.workOrderItem.count({
      where: { work_order_id: workOrderId, completed: false, id: { not: workOrderItemId } },
    });
    if (remaining === 0) {
      await tx.workOrder.update({
        where: { id: workOrderId },
        data: { status: "Completed", completedAt: new Date() },
      });
    }
  });

  return { alreadyCompleted: false };
}

export type SendResult = { sent: boolean; errors: string[] };

// Sends (or resends) a single work order's link to whoever it's currently
// assigned to, independent of the daily sweep - used by the "Send" button
// on the work order detail page and by the bulk "Send selected" action.
export async function sendWorkOrderNow(workOrderId: string): Promise<SendResult> {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: { property: true, assignedTeamMember: true },
  });
  if (!workOrder) throw new Error("Work order not found.");
  if (!workOrder.assignedTeamMember) {
    return { sent: false, errors: ["No team member assigned."] };
  }

  const link = workOrderLink(workOrder.share_token);
  const result = await sendWorkOrderLink(workOrder.assignedTeamMember, workOrder.property.name_address, link);

  if (result.emailSent || result.smsSent) {
    await prisma.workOrder.update({ where: { id: workOrderId }, data: { sent_at: new Date() } });
    return { sent: true, errors: result.errors };
  }
  return { sent: false, errors: result.errors.length > 0 ? result.errors : ["No channel configured."] };
}

export type SweepResult = {
  created: number;
  sent: number;
  skippedNoTeamMember: number;
  errors: string[];
};

// Finds active properties whose next scheduled restock (last restock date +
// cadence) falls tomorrow, creates a work order for each (if one doesn't
// already exist for that date), and emails/texts the shareable link to the
// property's assigned team member. Meant to be run daily - for now it's
// triggered by the "Send today's work orders" button on the Work Orders
// page rather than an automated cron, since that needs a hosting decision
// first (see docs/PROJECT_SPEC.md).
export async function runDueWorkOrderSweep(): Promise<SweepResult> {
  const result: SweepResult = { created: 0, sent: 0, skippedNoTeamMember: 0, errors: [] };

  const properties = await prisma.property.findMany({
    where: { active: true },
    include: {
      restockEvents: { orderBy: { date: "desc" }, take: 1 },
      assignedTeamMember: true,
    },
  });

  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

  for (const property of properties) {
    const lastEvent = property.restockEvents[0];
    if (!lastEvent) continue;

    const dueDate = addUtcDays(lastEvent.date, property.restock_frequency_days);
    const isDueTomorrow =
      dueDate.getUTCFullYear() === tomorrow.getUTCFullYear() &&
      dueDate.getUTCMonth() === tomorrow.getUTCMonth() &&
      dueDate.getUTCDate() === tomorrow.getUTCDate();

    if (!isDueTomorrow) continue;

    const existing = await prisma.workOrder.findFirst({
      where: {
        property_id: property.id,
        scheduled_for: tomorrow,
      },
    });
    if (existing) continue;

    const workOrder = await createWorkOrderForProperty(property.id, { scheduledFor: tomorrow });
    result.created += 1;

    if (!property.assignedTeamMember) {
      result.skippedNoTeamMember += 1;
      continue;
    }

    const link = workOrderLink(workOrder.share_token);
    const notifyResult = await sendWorkOrderLink(
      property.assignedTeamMember,
      property.name_address,
      link
    );

    if (notifyResult.emailSent || notifyResult.smsSent) {
      await prisma.workOrder.update({ where: { id: workOrder.id }, data: { sent_at: new Date() } });
      result.sent += 1;
    }
    result.errors.push(...notifyResult.errors.map((e) => `${property.name_address}: ${e}`));
  }

  return result;
}
