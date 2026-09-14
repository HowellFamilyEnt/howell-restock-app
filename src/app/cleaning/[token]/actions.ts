"use server";

import { prisma } from "@/lib/prisma";
import { uploadNotePhoto } from "@/lib/storage";
import { emailCleaningNoteToServiceAdmin } from "@/lib/notes";

// Public, unauthenticated - the token itself is the access control, same
// pattern as the work order share_token flow (src/app/wo/[token]). Looked
// up fresh here rather than trusted from the client, and requires
// cleaning_enabled so an access link created without that box checked
// can't be used to reach this form.
export async function submitCleaningNoteAction(
  token: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string> {
  const link = await prisma.accessLink.findUnique({ where: { token } });
  if (!link || !link.active || !link.cleaning_enabled) {
    throw new Error("This link is no longer active.");
  }

  const propertyId = String(formData.get("property_id") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const photoFiles = formData.getAll("photos").filter((f): f is File => f instanceof File);

  if (!propertyId) return "Pick a property first.";
  if (!description) return "Describe what's needed first.";

  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property || !property.active) return "That property isn't available anymore.";

  const note = await prisma.note.create({
    data: {
      property_id: propertyId,
      date: new Date(),
      category: "RestockIssue",
      description,
    },
  });

  const photoUrls: string[] = [];
  const uploadErrors: string[] = [];
  for (const file of photoFiles) {
    if (file.size === 0) continue;
    try {
      const uploaded = await uploadNotePhoto(file);
      await prisma.notePhoto.create({ data: { note_id: note.id, url: uploaded.url } });
      photoUrls.push(uploaded.url);
    } catch (error) {
      uploadErrors.push(error instanceof Error ? error.message : "Photo upload failed.");
    }
  }

  await emailCleaningNoteToServiceAdmin(property.name_address, description, photoUrls);

  if (uploadErrors.length > 0) {
    return `Sent, but: ${uploadErrors.join("; ")}`;
  }
  return "Sent! Thanks for flagging it.";
}
