import { prisma } from "@/lib/prisma";
import { uploadNotePhoto } from "@/lib/storage";
import { sendEmail } from "@/lib/notify";
import { getServiceAdminEmail } from "@/lib/settings";
import type { NoteCategory } from "@prisma/client";

export async function addNoteToWorkOrder(input: {
  workOrderId: string;
  propertyId: string;
  category: NoteCategory;
  description: string;
  photoFiles: File[];
}) {
  if (!input.description.trim()) {
    throw new Error("A description is required.");
  }

  const note = await prisma.note.create({
    data: {
      property_id: input.propertyId,
      work_order_id: input.workOrderId,
      date: new Date(),
      category: input.category,
      description: input.description.trim(),
    },
  });

  // Photos upload one at a time and are attached as each succeeds, so a
  // failure partway through (bad file, storage hiccup) still keeps the
  // note and whatever photos made it, rather than losing everything.
  const uploadErrors: string[] = [];
  for (const file of input.photoFiles) {
    if (file.size === 0) continue; // empty file input slot
    try {
      const uploaded = await uploadNotePhoto(file);
      await prisma.notePhoto.create({ data: { note_id: note.id, url: uploaded.url } });
    } catch (error) {
      uploadErrors.push(error instanceof Error ? error.message : "Photo upload failed.");
    }
  }

  return { note, uploadErrors };
}

// Emails every note attached to a work order to the configured service
// admin, once - called when the work order is fully completed (see
// completeWorkOrderItem in src/lib/workorders.ts). Best-effort: returns
// quietly if there's nothing to send or no admin email configured, since a
// missing setting shouldn't block completing the work order.
export async function emailWorkOrderNotesToServiceAdmin(workOrderId: string): Promise<void> {
  const adminEmail = await getServiceAdminEmail();
  if (!adminEmail) return;

  const notes = await prisma.note.findMany({
    where: { work_order_id: workOrderId },
    include: { photos: true, property: true },
    orderBy: { createdAt: "asc" },
  });
  if (notes.length === 0) return;

  const propertyName = notes[0].property.name_address;
  const lines: string[] = [
    `Notes from a completed work order at ${propertyName}:`,
    "",
  ];

  for (const note of notes) {
    lines.push(`[${note.category}] ${note.description}`);
    for (const photo of note.photos) {
      lines.push(`  photo: ${photo.url}`);
    }
    lines.push("");
  }

  await sendEmail(adminEmail, `Service note: ${propertyName}`, lines.join("\n"));
}

// Emails a single standalone note immediately, rather than waiting for a
// work order to complete - used by the no-login /cleaning/[token] form
// (see src/app/cleaning/[token]/actions.ts), which isn't tied to any work
// order. Best-effort, same as emailWorkOrderNotesToServiceAdmin: a missing
// setting shouldn't block the note from being saved.
export async function emailCleaningNoteToServiceAdmin(
  propertyName: string,
  description: string,
  photoUrls: string[]
): Promise<void> {
  const adminEmail = await getServiceAdminEmail();
  if (!adminEmail) return;

  const lines = [`Cleaning crew report at ${propertyName}:`, "", description];
  for (const url of photoUrls) lines.push(`photo: ${url}`);

  await sendEmail(adminEmail, `Cleaning report: ${propertyName}`, lines.join("\n"));
}
