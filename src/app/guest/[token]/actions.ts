"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSeamApiKey } from "@/lib/settings";
import { pullSeamBackupAccessCode } from "@/lib/seam";

// Guest-facing version of the staff "Pull backup code" button on
// /guest-access-codes - same underlying Seam call
// (pullSeamBackupAccessCode, already built and verified live in P2), just
// reached through the share_token instead of an admin login. The token
// itself is the access control, same pattern as /wo/[token].
export async function requestBackupCode(token: string): Promise<string> {
  const confirmation = await prisma.bookingConfirmation.findUnique({ where: { share_token: token } });
  if (!confirmation) return "Not found.";

  const guestAccessCode = await prisma.guestAccessCode.findUnique({
    where: { hostaway_reservation_id: confirmation.hostaway_reservation_id },
  });
  if (!guestAccessCode?.seam_access_code_id) return "No digital key on file for this stay.";

  const apiKey = await getSeamApiKey();
  if (!apiKey) return "Smart access isn't configured right now - contact us directly.";

  try {
    const backup = await pullSeamBackupAccessCode(apiKey, guestAccessCode.seam_access_code_id);
    await prisma.guestAccessCode.update({
      where: { id: guestAccessCode.id },
      data: { code: backup.code, status: backup.display_status ?? backup.status, seam_backup_pulled_at: new Date() },
    });
    revalidatePath("/guest/[token]", "page");
    return "New code ready below.";
  } catch (error) {
    // Seam's raw error is logged for us, never shown to the guest - most
    // failures here are actually the common case (the code already set
    // successfully, so there's nothing to fall back to - confirmed live in
    // P2 testing), which reads as reassuring rather than alarming here.
    console.error("Guest portal: pullSeamBackupAccessCode failed", error);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("access_code_already_set_on_device")) {
      return "Your code should already be working — double check you're entering it correctly. Still stuck? Contact us directly.";
    }
    return "Couldn't get a new code right now - contact us directly.";
  }
}
