import crypto from "crypto";
import { getSupabaseStorageCredentials } from "@/lib/settings";

const BUCKET = "work-order-photos";
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

let bucketEnsured = false;

async function ensureBucket(projectUrl: string, serviceRoleKey: string) {
  if (bucketEnsured) return;

  // Idempotent: creating an already-existing bucket just 400s, which we
  // ignore. Public so uploaded photo URLs work directly in emails/pages
  // without a signed-URL step.
  await fetch(`${projectUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: BUCKET, public: true }),
  }).catch(() => {
    // Network hiccup creating the bucket - the upload call below will
    // surface a clearer error if the bucket genuinely doesn't exist.
  });

  bucketEnsured = true;
}

export type UploadedPhoto = {
  url: string;
};

// Uploads one image file to Supabase Storage and returns its public URL.
// Throws if Supabase Storage isn't configured (see Settings page) or the
// file isn't a reasonably-sized image - callers should catch and surface a
// clear message rather than losing the note the file was attached to.
export async function uploadNotePhoto(file: File): Promise<UploadedPhoto> {
  const credentials = await getSupabaseStorageCredentials();
  if (!credentials) {
    throw new Error(
      "Photo storage isn't configured yet. Add a Supabase project URL and service role key on the Settings page."
    );
  }

  if (!file.type.startsWith("image/")) {
    throw new Error(`"${file.name}" isn't an image file.`);
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`"${file.name}" is larger than 10MB.`);
  }

  await ensureBucket(credentials.projectUrl, credentials.serviceRoleKey);

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomBytes(12).toString("hex")}.${ext}`;

  const bytes = await file.arrayBuffer();
  const res = await fetch(`${credentials.projectUrl}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.serviceRoleKey}`,
      apikey: credentials.serviceRoleKey,
      "Content-Type": file.type,
    },
    body: bytes,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Photo upload failed: ${res.status} ${body.slice(0, 200)}`);
  }

  return { url: `${credentials.projectUrl}/storage/v1/object/public/${BUCKET}/${path}` };
}
