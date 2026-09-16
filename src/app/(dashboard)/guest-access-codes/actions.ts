"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSeamApiKey } from "@/lib/settings";
import { pullSeamBackupAccessCode } from "@/lib/seam";

// Staff-usable version of the "code not working" flow - the guest-facing
// button belongs on the guest portal (P3 on the SuiteOp roadmap), which
// doesn't exist yet. This is the same underlying action that button will
// call once it does, just triggered by a staff member today when a guest
// calls in about a bad code.
export async function pullBackupCode(guestAccessCodeId: string): Promise<string> {
  const row = await prisma.guestAccessCode.findUnique({ where: { id: guestAccessCodeId } });
  if (!row) return "Not found.";
  if (!row.seam_access_code_id) return "No Seam code was ever issued for this one.";

  const apiKey = await getSeamApiKey();
  if (!apiKey) return "No Seam API key configured.";

  try {
    const backup = await pullSeamBackupAccessCode(apiKey, row.seam_access_code_id);
    await prisma.guestAccessCode.update({
      where: { id: guestAccessCodeId },
      data: { code: backup.code, status: backup.display_status ?? backup.status, seam_backup_pulled_at: new Date() },
    });
    revalidatePath("/guest-access-codes");
    return "Pulled a backup code.";
  } catch (error) {
    return error instanceof Error ? error.message : "Seam request failed.";
  }
}
