import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { addUtcDays } from "@/lib/calendar";
import GuestPortalView from "@/components/GuestPortalView";

const DEFAULT_CHECK_IN_HOUR = 16;
const DEFAULT_CHECK_OUT_HOUR = 10;

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Admin-only preview of the guest portal (src/app/guest/[token]/page.tsx),
// reached from the Settings page - lets the admin see/test the layout for
// any property without a real reservation. Placeholder stay dates (today
// +2 to +5) and a fixed 4pm/10am check-in/out, clearly labeled as a
// preview so it's never mistaken for a real guest's actual info. No "My
// code isn't working" button here - that pulls a real Seam backup code
// from a real guest's pool, never something to expose against fake data.
export default async function GuestPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string }>;
}) {
  const { propertyId } = await searchParams;
  if (!propertyId) notFound();

  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) notFound();

  const [recentGuestCode, checkinPhotos, parkingPhotos, contactSettings] = await Promise.all([
    prisma.guestAccessCode.findFirst({
      where: { property_id: property.id, purpose: "guest", code: { not: null } },
      orderBy: { createdAt: "desc" },
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
  ]);

  const today = new Date();
  const arrivalDateStr = isoDate(addUtcDays(today, 2));
  const departureDateStr = isoDate(addUtcDays(today, 5));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/settings" className="text-sm text-gray-500 hover:text-gray-900">
          ← Settings
        </Link>
        <div className="mt-1 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Preview only — dates and check-in/out times below are placeholders, not a real reservation.
          {recentGuestCode && " The digital key shown is the most recent real one issued for this property."}
        </div>
      </div>

      <GuestPortalView
        property={property}
        arrivalDateStr={arrivalDateStr}
        departureDateStr={departureDateStr}
        checkInHour={DEFAULT_CHECK_IN_HOUR}
        checkOutHour={DEFAULT_CHECK_OUT_HOUR}
        digitalKey={
          recentGuestCode?.code
            ? { code: recentGuestCode.code, starts_at: recentGuestCode.starts_at, ends_at: recentGuestCode.ends_at }
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
      />
    </div>
  );
}
