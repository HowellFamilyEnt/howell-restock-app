import { formatHour, formatReservationDate } from "@/lib/calendar";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="mb-2 text-sm font-semibold tracking-tight text-gray-900">{title}</h2>
      {children}
    </div>
  );
}

export type GuestPortalProperty = {
  name_address: string;
  address: string | null;
  master_door_code: string | null;
  guest_checkin_instructions: string | null;
  wifi_name: string | null;
  wifi_password: string | null;
  house_rules: string | null;
  parking_instructions: string | null;
  building_photo_url: string | null;
};

// Google's universal maps link - opens the native Maps app on
// Android/iOS if one's installed (whichever the device treats as
// default), falls back to Google Maps in the browser otherwise. Works
// off just an address, no geocoding needed on our side.
function directionsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export type GuestPortalDigitalKey = {
  code: string;
  starts_at: Date | null;
  ends_at: Date | null;
};

export type GuestPortalCheckinPhoto = {
  id: string;
  url: string;
  caption: string | null;
};

export type GuestContactPerson = { name: string | null; phone: string | null };

export type GuestPortalContact = {
  header: string | null;
  general: GuestContactPerson;
  maintenance: GuestContactPerson;
  afterHours: GuestContactPerson;
};

// The actual guest-facing layout - shared by the real portal
// (src/app/guest/[token]/page.tsx) and the admin preview
// (src/app/(dashboard)/guest-preview/page.tsx), so the two can never drift
// apart: any layout change here shows up identically in both. The preview
// omits `backupCodeSlot` (that button pulls a real Seam backup code from
// a real guest's pool - never something to expose against fake data).
export default function GuestPortalView({
  property,
  arrivalDateStr,
  departureDateStr,
  checkInHour,
  checkOutHour,
  digitalKey,
  checkinPhotos,
  parkingPhotos,
  contact,
  backupCodeSlot,
  upgradesSection,
  accentColor,
}: {
  property: GuestPortalProperty;
  arrivalDateStr: string | null | undefined;
  departureDateStr: string | null | undefined;
  checkInHour: number | null | undefined;
  checkOutHour: number | null | undefined;
  digitalKey: GuestPortalDigitalKey | null;
  checkinPhotos: GuestPortalCheckinPhoto[];
  parkingPhotos: GuestPortalCheckinPhoto[];
  contact: GuestPortalContact | null;
  backupCodeSlot?: React.ReactNode;
  // Upgrade-request forms (SuiteOp roadmap P4) - only ever passed by the
  // real guest portal, never /guest-preview, which must not be able to
  // trigger a real Stripe charge.
  upgradesSection?: React.ReactNode;
  // Set as a CSS custom property on the wrapper below, so it cascades
  // down to UpgradeRequestSection's buttons too even though those are
  // passed in as children rather than rendered directly here.
  accentColor?: string | null;
}) {
  const checkInLabel = formatHour(checkInHour);
  const checkOutLabel = formatHour(checkOutHour);

  return (
    <div
      className="mx-auto max-w-2xl space-y-6"
      style={{ "--accent": accentColor || "#111827" } as React.CSSProperties}
    >
      {property.building_photo_url && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={property.building_photo_url}
          alt={property.name_address}
          className="h-48 w-full rounded-lg border border-gray-200 object-cover"
        />
      )}

      <div>
        <h1 className="text-lg font-semibold text-gray-900">{property.name_address}</h1>
        {property.address && (
          <p className="text-sm text-gray-500">
            {property.address}{" "}
            <a
              href={directionsUrl(property.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-gray-700 underline"
            >
              Get directions →
            </a>
          </p>
        )}
      </div>

      <Section title="Your stay">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase text-gray-400">Check-in</p>
            <p className="text-gray-900">
              {arrivalDateStr ? formatReservationDate(arrivalDateStr) : "—"}
              {checkInLabel && <span className="block text-gray-500">after {checkInLabel}</span>}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-400">Check-out</p>
            <p className="text-gray-900">
              {departureDateStr ? formatReservationDate(departureDateStr) : "—"}
              {checkOutLabel && <span className="block text-gray-500">by {checkOutLabel}</span>}
            </p>
          </div>
        </div>
      </Section>

      <Section title="Door Code">
        {digitalKey ? (
          <div>
            <p className="text-2xl font-semibold tracking-wide text-gray-900">{digitalKey.code}</p>
            {digitalKey.starts_at && digitalKey.ends_at && (
              <p className="mt-1 text-xs text-gray-500">
                Active {digitalKey.starts_at.toISOString().slice(0, 16).replace("T", " ")} –{" "}
                {digitalKey.ends_at.toISOString().slice(0, 16).replace("T", " ")}
              </p>
            )}
            {backupCodeSlot}
          </div>
        ) : property.master_door_code ? (
          <p className="text-2xl font-semibold tracking-wide text-gray-900">{property.master_door_code}</p>
        ) : (
          <p className="text-sm text-gray-500">Access details will be sent separately before check-in.</p>
        )}
      </Section>

      {(property.guest_checkin_instructions || checkinPhotos.length > 0) && (
        <Section title="Building & unit access">
          {property.guest_checkin_instructions && (
            <p className="whitespace-pre-wrap text-sm text-gray-700">{property.guest_checkin_instructions}</p>
          )}
          {checkinPhotos.length > 0 && (
            <ol className={`space-y-4 ${property.guest_checkin_instructions ? "mt-4" : ""}`}>
              {checkinPhotos.map((photo, index) => (
                <li key={photo.id} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: "var(--accent)" }}
                  >
                    {index + 1}
                  </span>
                  <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.caption ?? `Step ${index + 1}`}
                      className="max-w-xs rounded-lg border border-gray-200"
                    />
                    {photo.caption && <p className="mt-1 text-sm text-gray-700">{photo.caption}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Section>
      )}

      {(property.parking_instructions || parkingPhotos.length > 0) && (
        <Section title="Parking">
          {property.parking_instructions && (
            <p className="whitespace-pre-wrap text-sm text-gray-700">{property.parking_instructions}</p>
          )}
          {parkingPhotos.length > 0 && (
            <ol className={`space-y-4 ${property.parking_instructions ? "mt-4" : ""}`}>
              {parkingPhotos.map((photo, index) => (
                <li key={photo.id} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: "var(--accent)" }}
                  >
                    {index + 1}
                  </span>
                  <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.caption ?? `Step ${index + 1}`}
                      className="max-w-xs rounded-lg border border-gray-200"
                    />
                    {photo.caption && <p className="mt-1 text-sm text-gray-700">{photo.caption}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Section>
      )}

      {(property.wifi_name || property.wifi_password) && (
        <Section title="WiFi">
          <div className="text-sm text-gray-700">
            {property.wifi_name && (
              <p>
                Network: <span className="font-medium">{property.wifi_name}</span>
              </p>
            )}
            {property.wifi_password && (
              <p>
                Password: <span className="font-medium">{property.wifi_password}</span>
              </p>
            )}
          </div>
        </Section>
      )}

      {property.house_rules && (
        <Section title="House rules">
          <p className="whitespace-pre-wrap text-sm text-gray-700">{property.house_rules}</p>
        </Section>
      )}

      {upgradesSection}

      {contact &&
        (contact.header || contact.general.name || contact.maintenance.name || contact.afterHours.name) && (
          <Section title="Contact us">
            <div className="space-y-4">
              {contact.header && <p className="text-sm text-gray-600">{contact.header}</p>}

              {[
                { title: "General Inquiry", person: contact.general },
                { title: "Maintenance", person: contact.maintenance },
                { title: "After Hours", person: contact.afterHours },
              ].map(
                ({ title, person }) =>
                  (person.name || person.phone) && (
                    <div key={title}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p>
                      {person.name && <p className="text-sm font-medium text-gray-900">{person.name}</p>}
                      {person.phone && (
                        <a href={`tel:${person.phone}`} className="text-sm text-gray-700 underline">
                          {person.phone}
                        </a>
                      )}
                    </div>
                  )
              )}
            </div>
          </Section>
        )}
    </div>
  );
}
