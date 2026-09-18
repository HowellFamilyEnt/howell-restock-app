import { prisma } from "@/lib/prisma";
import { getSeamApiKey } from "@/lib/settings";
import { createSeamAccessCode, deleteSeamAccessCode } from "@/lib/seam";

// Standing per-person codes for staff, kept in sync across every
// property that has a lock - see the TeamAccessCode model comment for
// why the code is the last 4 digits of the member's phone. All of this
// is additive to whatever SuiteOp already pushed to a lock (its own
// user=... codes); nothing here touches those, on purpose - see the
// "HFE-Team-" prefix, meant to make ours obviously distinguishable
// during the transition (Lock details page shows the raw name either
// way). Removing SuiteOp's old codes once ours are confirmed working is
// a manual, deliberate step from the Lock details page.
function lastFourDigits(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return null;
  return digits.slice(-4);
}

function codeNameFor(memberName: string): string {
  return `HFE-Team-${memberName}`;
}

// Creates or repairs one member's code on one property's lock. Safe to
// call repeatedly (e.g. from a full resync) - if a row already has a
// live Seam code, it's left alone.
export async function provisionTeamCode(teamMemberId: string, propertyId: string): Promise<void> {
  const [member, property] = await Promise.all([
    prisma.teamMember.findUnique({ where: { id: teamMemberId } }),
    prisma.property.findUnique({ where: { id: propertyId } }),
  ]);
  if (!member || !member.active || !property?.smart_lock_id) return;

  const code = member.phone ? lastFourDigits(member.phone) : null;
  if (!code) {
    await prisma.teamAccessCode.upsert({
      where: { team_member_id_property_id: { team_member_id: teamMemberId, property_id: propertyId } },
      update: { error: "No phone number on file - can't derive a code." },
      create: {
        team_member_id: teamMemberId,
        property_id: propertyId,
        error: "No phone number on file - can't derive a code.",
      },
    });
    return;
  }

  const existing = await prisma.teamAccessCode.findUnique({
    where: { team_member_id_property_id: { team_member_id: teamMemberId, property_id: propertyId } },
  });
  if (existing?.seam_access_code_id && existing.code === code) return; // already correct

  const apiKey = await getSeamApiKey();
  if (!apiKey) {
    await prisma.teamAccessCode.upsert({
      where: { team_member_id_property_id: { team_member_id: teamMemberId, property_id: propertyId } },
      update: { error: "No Seam API key configured." },
      create: { team_member_id: teamMemberId, property_id: propertyId, error: "No Seam API key configured." },
    });
    return;
  }

  // Replace rather than update in place - simpler and matches how a
  // phone-number change needs to work anyway (the old PIN must stop
  // working, not just get relabeled).
  if (existing?.seam_access_code_id) {
    await deleteSeamAccessCode(apiKey, existing.seam_access_code_id).catch(() => {});
  }

  try {
    const accessCode = await createSeamAccessCode(apiKey, {
      deviceId: property.smart_lock_id,
      name: codeNameFor(member.name),
      code,
    });
    await prisma.teamAccessCode.upsert({
      where: { team_member_id_property_id: { team_member_id: teamMemberId, property_id: propertyId } },
      update: {
        seam_access_code_id: accessCode.access_code_id,
        code,
        status: accessCode.display_status ?? accessCode.status,
        error: null,
      },
      create: {
        team_member_id: teamMemberId,
        property_id: propertyId,
        seam_access_code_id: accessCode.access_code_id,
        code,
        status: accessCode.display_status ?? accessCode.status,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Seam request failed.";
    await prisma.teamAccessCode.upsert({
      where: { team_member_id_property_id: { team_member_id: teamMemberId, property_id: propertyId } },
      update: { error: message },
      create: { team_member_id: teamMemberId, property_id: propertyId, error: message },
    });
  }
}

export async function removeTeamCode(teamMemberId: string, propertyId: string): Promise<void> {
  const existing = await prisma.teamAccessCode.findUnique({
    where: { team_member_id_property_id: { team_member_id: teamMemberId, property_id: propertyId } },
  });
  if (!existing) return;

  if (existing.seam_access_code_id) {
    const apiKey = await getSeamApiKey();
    if (apiKey) await deleteSeamAccessCode(apiKey, existing.seam_access_code_id).catch(() => {});
  }
  await prisma.teamAccessCode.delete({ where: { id: existing.id } });
}

// New team member: push their code to every active property that
// already has a lock.
export async function provisionTeamCodesForNewMember(teamMemberId: string): Promise<void> {
  const properties = await prisma.property.findMany({
    where: { active: true, smart_lock_id: { not: null } },
    select: { id: true },
  });
  await Promise.all(properties.map((p) => provisionTeamCode(teamMemberId, p.id)));
}

// A lock just got assigned to a property: push every active member's
// code onto it.
export async function provisionTeamCodesForProperty(propertyId: string): Promise<void> {
  const members = await prisma.teamMember.findMany({ where: { active: true }, select: { id: true } });
  await Promise.all(members.map((m) => provisionTeamCode(m.id, propertyId)));
}

// A member was deactivated or deleted: pull their code off every lock
// they had one on.
export async function removeAllTeamCodesForMember(teamMemberId: string): Promise<void> {
  const rows = await prisma.teamAccessCode.findMany({ where: { team_member_id: teamMemberId } });
  await Promise.all(rows.map((r) => removeTeamCode(teamMemberId, r.property_id)));
}

// Full backfill/repair pass across every active member x every
// active property-with-a-lock - the create/assign triggers cover new
// additions going forward, but existing members and existing locked
// properties from before this feature existed need one manual run to
// get their first codes.
export async function syncAllTeamCodes(): Promise<{ attempted: number }> {
  const [members, properties] = await Promise.all([
    prisma.teamMember.findMany({ where: { active: true }, select: { id: true } }),
    prisma.property.findMany({ where: { active: true, smart_lock_id: { not: null } }, select: { id: true } }),
  ]);

  for (const member of members) {
    for (const property of properties) {
      await provisionTeamCode(member.id, property.id);
    }
  }

  return { attempted: members.length * properties.length };
}
