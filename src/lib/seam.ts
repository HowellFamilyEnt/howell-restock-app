// Seam's REST API - confirmed live against their public docs (2026-09-16):
// base URL https://connect.getseam.com, Bearer token auth. Time-bound
// access codes (starts_at/ends_at) are auto-removed from the lock at
// ends_at by Seam itself, so nothing here needs to actively revoke a
// code at checkout. use_backup_access_code_pool is Seam's own "N spare
// one-time codes in case the primary fails to sync" feature - the
// "3 reserve codes" design in the SuiteOp roadmap doesn't need to be
// hand-built, it's a flag on the create call plus a separate pull call.

const SEAM_BASE_URL = "https://connect.getseam.com";

async function seamRequest<T>(apiKey: string, path: string, body: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${SEAM_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Seam ${path} failed: ${res.status} ${text.slice(0, 200)}`);
  }

  return (await res.json()) as T;
}

export type SeamLock = {
  device_id: string;
  display_name: string;
  properties?: { online?: boolean };
};

export async function listSeamLocks(apiKey: string): Promise<SeamLock[]> {
  const data = await seamRequest<{ locks: SeamLock[] }>(apiKey, "/locks/list");
  return data.locks ?? [];
}

export type SeamAccessCode = {
  access_code_id: string;
  code: string | null;
  status: string;
  display_status?: string;
};

export async function createSeamAccessCode(
  apiKey: string,
  input: {
    deviceId: string;
    name: string;
    startsAt?: Date;
    endsAt?: Date;
    isOneTimeUse?: boolean;
    useBackupPool?: boolean;
  }
): Promise<SeamAccessCode> {
  const data = await seamRequest<{ access_code: SeamAccessCode }>(apiKey, "/access_codes/create", {
    device_id: input.deviceId,
    name: input.name,
    ...(input.startsAt ? { starts_at: input.startsAt.toISOString() } : {}),
    ...(input.endsAt ? { ends_at: input.endsAt.toISOString() } : {}),
    ...(input.isOneTimeUse ? { is_one_time_use: true } : {}),
    ...(input.useBackupPool ? { use_backup_access_code_pool: true } : {}),
  });
  return data.access_code;
}

export async function pullSeamBackupAccessCode(apiKey: string, accessCodeId: string): Promise<SeamAccessCode> {
  const data = await seamRequest<{ access_code: SeamAccessCode }>(apiKey, "/access_codes/pull_backup_access_code", {
    access_code_id: accessCodeId,
  });
  return data.access_code;
}
