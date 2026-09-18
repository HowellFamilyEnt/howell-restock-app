"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { provisionTeamCodesForNewMember, removeAllTeamCodesForMember, syncAllTeamCodes } from "@/lib/teamAccessCodes";

// A handful of visually distinct defaults, cycled by current member count
// so new members don't all land on the same color before anyone's picked
// one explicitly.
const DEFAULT_COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#d97706", "#9333ea", "#0891b2", "#db2777", "#65a30d",
];

export async function createTeamMember(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!name) {
    throw new Error("Name is required.");
  }

  const existingCount = await prisma.teamMember.count();

  const member = await prisma.teamMember.create({
    data: {
      name,
      email: email || null,
      phone: phone || null,
      color: DEFAULT_COLORS[existingCount % DEFAULT_COLORS.length],
    },
  });

  await provisionTeamCodesForNewMember(member.id);

  revalidatePath("/team");
  revalidatePath("/locks/[deviceId]", "page");
}

export async function updateTeamMemberColor(memberId: string, formData: FormData) {
  const color = String(formData.get("color") ?? "").trim();
  await prisma.teamMember.update({
    where: { id: memberId },
    data: { color: color || null },
  });
  revalidatePath("/team");
  revalidatePath("/calendar");
}

export async function toggleTeamMemberActive(memberId: string, next: boolean) {
  await prisma.teamMember.update({
    where: { id: memberId },
    data: { active: next },
  });

  // Deactivating revokes their standing access everywhere; reactivating
  // re-provisions it the same way a brand-new member would get it.
  if (next) {
    await provisionTeamCodesForNewMember(memberId);
  } else {
    await removeAllTeamCodesForMember(memberId);
  }

  revalidatePath("/team");
  revalidatePath("/locks/[deviceId]", "page");
}

export async function deleteTeamMember(
  memberId: string,
  _prevState: string | undefined,
  _formData: FormData
): Promise<string> {
  const [propertyCount, workOrderCount] = await Promise.all([
    prisma.property.count({ where: { assignedTeamMemberId: memberId } }),
    prisma.workOrder.count({ where: { assigned_team_member_id: memberId } }),
  ]);

  if (propertyCount > 0 || workOrderCount > 0) {
    return `Can't delete — assigned to ${propertyCount} propert${propertyCount === 1 ? "y" : "ies"} and ${workOrderCount} work order${workOrderCount === 1 ? "" : "s"}. Deactivate instead.`;
  }

  await removeAllTeamCodesForMember(memberId);
  await prisma.teamMember.delete({ where: { id: memberId } });
  revalidatePath("/team");
  revalidatePath("/locks/[deviceId]", "page");
  return "Deleted.";
}

// Manual backfill/repair pass - covers existing members and existing
// locked properties from before this feature existed; the create/assign
// triggers handle everything going forward on their own.
export async function runTeamCodeSync(
  _prevState: string | undefined,
  _formData: FormData
): Promise<string> {
  const { attempted } = await syncAllTeamCodes();
  revalidatePath("/team");
  revalidatePath("/locks/[deviceId]", "page");
  return `Synced team codes (${attempted} member/property pairs checked).`;
}
