"use server";

import { revalidatePath } from "next/cache";
import { getSeamApiKey } from "@/lib/settings";
import { createSeamAccessCode, deleteSeamAccessCode } from "@/lib/seam";

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
    // Some codes set outside Seam (manufacturer app, keypad) can't
    // always be removed via the API depending on the lock brand - this
    // surfaces that instead of silently doing nothing.
    return error instanceof Error ? error.message : "Couldn't delete this code.";
  }

  revalidatePath("/locks/[deviceId]", "page");
  return "";
}
