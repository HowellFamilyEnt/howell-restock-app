import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import GuestPortalView from "@/components/GuestPortalView";
import BackupCodeButton from "./BackupCodeButton";

// No-login guest portal (SuiteOp roadmap P3), reached via the link in the
// direct booking-confirmation email/text (src/lib/bookingConfirmation.ts).
// Same access-control shape as /wo/[token]: the share_token itself is the
// only gate, looked up fresh here rather than trusted from the client.
// See src/app/(dashboard)/guest-preview/page.tsx for the admin-only
// preview of this same layout, without a real reservation.
export default async function GuestPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const confirmation = await prisma.bookingConfirmation.findUnique({
    where: { share_token: token },
    include: { property: true },
  });

  if (!confirmation || !confirmation.property) notFound();
  const property = confirmation.property;

  const [guestAccessCode, checkinPhotos] = await Promise.all([
    prisma.guestAccessCode.findUnique({
      where: { hostaway_reservation_id: confirmation.hostaway_reservation_id },
    }),
    prisma.checkinPhoto.findMany({ where: { property_id: property.id }, orderBy: { order: "asc" } }),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <GuestPortalView
        property={property}
        arrivalDateStr={confirmation.arrival_date?.toISOString().slice(0, 10)}
        departureDateStr={confirmation.departure_date?.toISOString().slice(0, 10)}
        checkInHour={confirmation.check_in_hour}
        checkOutHour={confirmation.check_out_hour}
        digitalKey={
          guestAccessCode?.code
            ? { code: guestAccessCode.code, starts_at: guestAccessCode.starts_at, ends_at: guestAccessCode.ends_at }
            : null
        }
        checkinPhotos={checkinPhotos}
        backupCodeSlot={<BackupCodeButton token={token} />}
      />
    </div>
  );
}
