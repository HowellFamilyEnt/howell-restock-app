"use client";

import { updateWorkOrderAssignmentAction } from "../actions";

export default function AssignmentForm({
  workOrderId,
  teamMembers,
  currentTeamMemberId,
}: {
  workOrderId: string;
  teamMembers: { id: string; name: string }[];
  currentTeamMemberId: string | null;
}) {
  const boundAction = updateWorkOrderAssignmentAction.bind(null, workOrderId);

  return (
    <form action={boundAction} className="flex items-end gap-3">
      <div className="flex-1 space-y-1">
        <label className="text-sm font-medium text-gray-700">Assigned to</label>
        <select
          key={currentTeamMemberId ?? "none"}
          name="assigned_team_member_id"
          defaultValue={currentTeamMemberId ?? ""}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Unassigned</option>
          {teamMembers.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        Save
      </button>
    </form>
  );
}
