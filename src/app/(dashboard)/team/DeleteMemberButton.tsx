"use client";

import { useActionState } from "react";
import { deleteTeamMember } from "./actions";

export default function DeleteMemberButton({ memberId }: { memberId: string }) {
  const boundAction = deleteTeamMember.bind(null, memberId);
  const [message, formAction, pending] = useActionState(boundAction, undefined);

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <button type="submit" disabled={pending} className="text-xs text-red-600 hover:underline disabled:opacity-50">
        Delete
      </button>
      {message && <span className="text-xs text-gray-400">{message}</span>}
    </form>
  );
}
