"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import crypto from "crypto";
import { ACCESS_SECTIONS } from "@/lib/accessLinks";

// Generic save/clear for any subset of IntegrationSettings' credential
// fields - used by the Hostaway, Email (Resend), and SMS (Twilio) sections
// on the Settings page. Blank fields mean "leave the existing value alone"
// (inputs are never pre-filled with the real secret), so an empty submit
// never wipes a saved credential.
export async function saveCredentialFields(
  fields: string[],
  _prevState: string | undefined,
  formData: FormData
): Promise<string> {
  const data: Record<string, string> = {};
  for (const field of fields) {
    const value = String(formData.get(field) ?? "").trim();
    if (value) data[field] = value;
  }

  if (Object.keys(data).length === 0) {
    return "Nothing to save.";
  }

  await prisma.integrationSettings.upsert({
    where: { id: "hostaway" },
    update: data as Prisma.IntegrationSettingsUpdateInput,
    create: { id: "hostaway", ...data },
  });

  revalidatePath("/settings");
  return "Saved.";
}

export async function clearCredentialFields(fields: string[]): Promise<void> {
  const data: Record<string, null> = {};
  for (const field of fields) data[field] = null;

  await prisma.integrationSettings.upsert({
    where: { id: "hostaway" },
    update: data as Prisma.IntegrationSettingsUpdateInput,
    create: { id: "hostaway" },
  });

  revalidatePath("/settings");
}

// Master kill switch for every guest-facing automation (direct booking
// confirmation, smart-access door codes) - see getGuestAutomationEnabled
// in src/lib/settings.ts. Off by default; flipping it on here is the only
// way anything actually reaches a real guest.
export async function toggleGuestAutomation(next: boolean): Promise<void> {
  await prisma.integrationSettings.upsert({
    where: { id: "hostaway" },
    update: { guest_automation_enabled: next },
    create: { id: "hostaway", guest_automation_enabled: next },
  });
  revalidatePath("/settings");
}

const VALID_SECTION_KEYS = new Set<string>(ACCESS_SECTIONS.map((s) => s.key));

export async function createAccessLink(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const sections = formData.getAll("sections").map(String).filter((s) => VALID_SECTION_KEYS.has(s));
  const cleaning_enabled = formData.get("cleaning_enabled") === "on";

  if (!name) throw new Error("Name is required.");
  if (sections.length === 0 && !cleaning_enabled) {
    throw new Error("Pick at least one section, or check Cleaning.");
  }

  const token = crypto.randomBytes(24).toString("hex");

  await prisma.accessLink.create({
    data: { name, token, sections, cleaning_enabled },
  });

  revalidatePath("/settings");
}

export async function toggleAccessLinkActive(linkId: string, next: boolean) {
  await prisma.accessLink.update({ where: { id: linkId }, data: { active: next } });
  revalidatePath("/settings");
}

export async function deleteAccessLink(linkId: string) {
  await prisma.accessLink.delete({ where: { id: linkId } });
  revalidatePath("/settings");
}

export async function updateGuestPortalAccentColor(formData: FormData) {
  const color = String(formData.get("guest_portal_accent_color") ?? "").trim();
  await prisma.integrationSettings.upsert({
    where: { id: "hostaway" },
    update: { guest_portal_accent_color: color || null },
    create: { id: "hostaway", guest_portal_accent_color: color || null },
  });
  revalidatePath("/settings");
  revalidatePath("/guest/[token]", "page");
  revalidatePath("/guest-preview");
}
