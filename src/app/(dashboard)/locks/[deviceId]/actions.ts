"use server";

import { revalidatePath } from "next/cache";
import { getSeamApiKey } from "@/lib/settings";
import { createSeamAccessCode, deleteSeamAccessCode, SeamApiError } from "@/lib/seam";

export async function addLockAccessCode(
  deviceId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string> {
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  if (!name) return "Give the code a name.";
  if (code && !/^\d{4,12}$/.test(code)) return "Code must be 4-12 digits.";

  const apiKey = await getSeamApiKey();
  if (!apiKey) return "No Seam API key configured on the Settings page.";

  try {
    await createSeamAccessCode(apiKey, { deviceId, name, code: code || undefined });
  } catch (error) {
    return error instanceof Error ? error.message : "Couldn't create the code.";
  }

  revalidatePath("/locks/[deviceId]", "page");
  return "";
}

export async function deleteLockAccessCode(
  accessCodeId: string,
  _prevState: string | undefined
): Promise<string> {
  const apiKey = await getSeamApiKey();
  if (!apiKey) return "No Seam API key configured.";

  try {
    await deleteSeamAccessCode(apiKey, accessCodeId);
  } catch (error) {
    // "offline_access_code_immutable": confirmed live 2026-09-18 - Seam
    // never allows deleting an offline (e.g. one-time-use) code once
    // it's fully set, on any lock. Not fixable from here - the code
    // stays live until it's actually used once. Anything else (a code
    // set outside Seam entirely, via the manufacturer's own app or
    // keypad) still surfaces as-is rather than silently doing nothing.
    if (error instanceof SeamApiError && error.type === "offline_access_code_immutable") {
      return "This is a one-time-use code, which Seam doesn't allow deleting once set. It'll disappear on its own the first time it's actually used.";
    }
    return error instanceof Error ? error.message : "Couldn't delete this code.";
  }

  revalidatePath("/locks/[deviceId]", "page");
  return "";
}
