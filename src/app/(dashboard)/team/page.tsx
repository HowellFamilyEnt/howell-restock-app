import { prisma } from "@/lib/prisma";
import { createTeamMember, toggleTeamMemberActive, updateTeamMemberColor } from "./actions";
import DeleteMemberButton from "./DeleteMemberButton";
import SaveButton from "@/components/SaveButton";

export default async function TeamPage() {
  const members = await prisma.teamMember.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Team</h1>
        <p className="text-sm text-gray-500">
          {members.length} total — assign members to properties to route work order links to them. Each
          member&apos;s color shows on their work orders on the Calendar page.
        </p>
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Calendar color</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map((member) => (
              <tr key={member.id} className={member.active ? "" : "opacity-50"}>
                <td className="px-4 py-2 font-medium text-gray-900">{member.name}</td>
                <td className="px-4 py-2 text-gray-600">{member.email ?? "—"}</td>
                <td className="px-4 py-2 text-gray-600">{member.phone ?? "—"}</td>
                <td className="px-4 py-2">
                  <form action={updateTeamMemberColor.bind(null, member.id)} className="flex items-center gap-2">
                    <input
                      type="color"
                      name="color"
                      defaultValue={member.color ?? "#6b7280"}
                      className="h-8 w-10 cursor-pointer rounded border border-gray-300 p-0.5"
                    />
                    <SaveButton size="sm" />
                  </form>
                </td>
                <td className="px-4 py-2">
                  <form action={toggleTeamMemberActive.bind(null, member.id, !member.active)}>
                    <button type="submit" className="text-xs text-gray-500 hover:text-gray-900">
                      {member.active ? "Active" : "Inactive"}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-2 text-right">
                  <DeleteMemberButton memberId={member.id} />
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  No team members yet — add one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {members.map((member) => (
          <div
            key={member.id}
            className={`rounded-lg border border-gray-200 bg-white p-4 ${member.active ? "" : "opacity-50"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="flex items-center gap-2 font-medium text-gray-900">
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-full border border-gray-300"
                  style={{ backgroundColor: member.color ?? "#6b7280" }}
                />
                {member.name}
              </span>
              <DeleteMemberButton memberId={member.id} />
            </div>
            <div className="mt-1 space-y-0.5 text-sm text-gray-600">
              {member.email && <p>{member.email}</p>}
              {member.phone && <p>{member.phone}</p>}
            </div>
            <form action={updateTeamMemberColor.bind(null, member.id)} className="mt-2 flex items-center gap-2">
              <input
                type="color"
                name="color"
                defaultValue={member.color ?? "#6b7280"}
                className="h-8 w-10 cursor-pointer rounded border border-gray-300 p-0.5"
              />
              <SaveButton size="sm" />
            </form>
            <form action={toggleTeamMemberActive.bind(null, member.id, !member.active)} className="mt-2">
              <button type="submit" className="text-xs text-gray-500 hover:text-gray-900">
                {member.active ? "Active" : "Inactive"}
              </button>
            </form>
          </div>
        ))}
        {members.length === 0 && (
          <p className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-gray-400">
            No team members yet — add one below.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Add a team member</h2>
        <form action={createTeamMember} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Name</label>
            <input name="name" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              name="email"
              type="email"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Phone</label>
            <input
              name="phone"
              type="tel"
              placeholder="+15551234567"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="col-span-3">
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Add team member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
