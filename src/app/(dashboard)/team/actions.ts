"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createTeamMember(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!name) {
    throw new Error("Name is required.");
  }

  await prisma.teamMember.create({
    data: { name, email: email || null, phone: phone || null },
  });

  revalidatePath("/team");
}

export async function toggleTeamMemberActive(memberId: string, next: boolean) {
  await prisma.teamMember.update({
    where: { id: memberId },
    data: { active: next },
  });
  revalidatePath("/team");
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

  await prisma.teamMember.delete({ where: { id: memberId } });
  revalidatePath("/team");
  return "Deleted.";
}
