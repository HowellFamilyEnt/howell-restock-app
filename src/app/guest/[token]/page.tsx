import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import GuestPortalView from "@/components/GuestPortalView";
import UpgradeRequestSection from "@/components/UpgradeRequestSection";
import BackupCodeButton from "./BackupCodeButton";
import { getStripePublishableKey, getGuestAutomationEnabled } from "@/lib/settings";
import { EARLY_CHECKIN_TIERS, LATE_CHECKOUT_TIERS, ADDON_TIERS } from "@/lib/upgradeTiers";

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

  const [guestAccessCode, checkinPhotos, parkingPhotos, contactSettings, stripePublishableKey, guestAutomationEnabled] =
    await Promise.all([
      prisma.guestAccessCode.findUnique({
        where: { hostaway_reservation_id: confirmation.hostaway_reservation_id },
      }),
      prisma.checkinPhoto.findMany({ where: { property_id: property.id }, orderBy: { order: "asc" } }),
      prisma.parkingPhoto.findMany({ where: { property_id: property.id }, orderBy: { order: "asc" } }),
      prisma.integrationSettings.findUnique({
        where: { id: "hostaway" },
        select: {
          guest_contact_header: true,
          guest_contact_general_name: true,
          guest_contact_general_phone: true,
          guest_contact_maintenance_name: true,
          guest_contact_maintenance_phone: true,
          guest_contact_afterhours_name: true,
          guest_contact_afterhours_phone: true,
          guest_contact_cleaning_name: true,
          guest_contact_cleaning_phone: true,
          guest_portal_accent_color: true,
        },
      }),
      getStripePublishableKey(),
      getGuestAutomationEnabled(),
    ]);

  // Upgrades (SuiteOp roadmap P4) - same guest-automation gate as
  // everything else guest-facing, plus a real Stripe key to actually
  // collect a card with.
  const upgradesAvailable = stripePublishableKey && guestAutomationEnabled && property.guest_automation_enabled;

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
        parkingPhotos={parkingPhotos}
        accentColor={contactSettings?.guest_portal_accent_color}
        contact={
          contactSettings
            ? {
                header: contactSettings.guest_contact_header,
                general: {
                  name: contactSettings.guest_contact_general_name,
                  phone: contactSettings.guest_contact_general_phone,
                },
                maintenance: {
                  name: contactSettings.guest_contact_maintenance_name,
                  phone: contactSettings.guest_contact_maintenance_phone,
                },
                afterHours: {
                  name: contactSettings.guest_contact_afterhours_name,
                  phone: contactSettings.guest_contact_afterhours_phone,
                },
                cleaning: {
                  name: contactSettings.guest_contact_cleaning_name,
                  phone: contactSettings.guest_contact_cleaning_phone,
                },
              }
            : null
        }
        backupCodeSlot={<BackupCodeButton token={token} />}
        upgradesSection={
          upgradesAvailable ? (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-gray-900">Upgrades</h2>
              <UpgradeRequestSection
                title="Early Check-In"
                description="Arrive before the standard check-in time."
                category="early_checkin"
                tiers={EARLY_CHECKIN_TIERS}
                guestPortalToken={token}
                publishableKey={stripePublishableKey!}
              />
              <UpgradeRequestSection
                title="Late Check-Out"
                description="Stay past the standard check-out time."
                category="late_checkout"
                tiers={LATE_CHECKOUT_TIERS}
                guestPortalToken={token}
                publishableKey={stripePublishableKey!}
              />
              <UpgradeRequestSection
                title="Add-ons"
                description="Extra items for your stay."
                category="addon"
                tiers={ADDON_TIERS}
                guestPortalToken={token}
                publishableKey={stripePublishableKey!}
              />
            </div>
          ) : null
        }
      />
    </div>
  );
}
