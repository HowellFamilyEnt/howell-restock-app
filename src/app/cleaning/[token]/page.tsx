import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { submitCleaningNoteAction } from "./actions";
import CleaningForm from "./CleaningForm";

// Sorts by street name, then house number - e.g. "9 W Ranchwood Dr" before
// "1712 NE 8th St" - so the crew can find an address the way they'd look
// for it on the street, not by listing name or database order. Falls back
// to name_address for the rare property with no `address` set.
function addressSortKey(property: { address: string | null; name_address: string }) {
  const raw = (property.address ?? property.name_address).split(",")[0].trim();
  const match = raw.match(/^(\d+)\s+(.*)$/);
  if (match) return { streetName: match[2].toLowerCase(), houseNumber: parseInt(match[1], 10) };
  return { streetName: raw.toLowerCase(), houseNumber: 0 };
}

export default async function CleaningPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const link = await prisma.accessLink.findUnique({ where: { token } });
  if (!link || !link.active || !link.cleaning_enabled) notFound();

  const properties = await prisma.property.findMany({ where: { active: true } });
  const sorted = [...properties].sort((a, b) => {
    const ka = addressSortKey(a);
    const kb = addressSortKey(b);
    if (ka.streetName !== kb.streetName) return ka.streetName.localeCompare(kb.streetName);
    return ka.houseNumber - kb.houseNumber;
  });

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-md space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Cleaning</h1>
          <p className="text-sm text-gray-500">
            See something out or running low? Pick the property, say what&apos;s needed, and submit.
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <CleaningForm
            properties={sorted.map((p) => ({ id: p.id, label: p.address ?? p.name_address }))}
            action={submitCleaningNoteAction.bind(null, token)}
          />
        </div>
      </div>
    </div>
  );
}
