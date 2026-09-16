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

// Named SeamDevice (not SeamLock) to avoid colliding with the Prisma
// SeamLock model (src/lib/seamSync.ts), which caches this shape locally so
// the /locks admin page can show it without hitting Seam on every load.
export type SeamDevice = {
  device_id: string;
  display_name: string;
  connected_account_id?: string;
  properties?: {
    online?: boolean;
    battery?: { level?: number; status?: string };
  };
};

export async function listSeamLocks(apiKey: string): Promise<SeamDevice[]> {
  const data = await seamRequest<{ locks: SeamDevice[] }>(apiKey, "/locks/list");
  return data.locks ?? [];
}

export type SeamConnectedAccount = {
  connected_account_id: string;
  account_type: string; // e.g. "schlage", "august" - confirmed live 2026-09-16
  account_type_display_name: string; // e.g. "Schlage", "August"
};

export async function listSeamConnectedAccounts(apiKey: string): Promise<SeamConnectedAccount[]> {
  const data = await seamRequest<{ connected_accounts: SeamConnectedAccount[] }>(
    apiKey,
    "/connected_accounts/list"
  );
  return data.connected_accounts ?? [];
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

// Shifts an already-issued code's active window - used when an upgrade
// request (early check-in / late checkout) is approved, so the guest's
// existing code doesn't need to be deleted and recreated. Confirmed POST
// live (docs said PATCH), and confirmed the response is an async
// action_attempt (same shape as /access_codes/delete), not the updated
// access_code object create returns - a real discrepancy from what the
// original type signature assumed, caught by testing the actual response
// rather than trusting the create-call shape to carry over. The window
// shift itself was confirmed applied via a follow-up /access_codes/get.
export async function updateSeamAccessCode(
  apiKey: string,
  input: { accessCodeId: string; startsAt: Date; endsAt: Date }
): Promise<void> {
  await seamRequest<{ action_attempt: { status: string } }>(apiKey, "/access_codes/update", {
    access_code_id: input.accessCodeId,
    starts_at: input.startsAt.toISOString(),
    ends_at: input.endsAt.toISOString(),
  });
}
