const BRAND_NAME = "Howell Family Enterprises";
const SUPPORT_NAME = "April Patal";
const SUPPORT_PHONE = "405-215-9866";

// Public, no login required (see src/proxy.ts's isLegalRoute) - required
// by Twilio's A2P 10DLC campaign registration to exist at a live,
// public URL before a campaign using the "Web Form" opt-in method (the
// guest's phone number, collected when booking a reservation through
// hfproperties.net) can be approved. Content follows exactly what
// Twilio's own campaign form specifies a Privacy Policy page must
// contain: titled "Privacy Policy", describes what's collected and how
// it's used, the required no-sharing-for-marketing statement verbatim,
// and the registered Brand name.
export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-6 rounded-lg border border-gray-200 bg-white p-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Privacy Policy</h1>
          <p className="mt-1 text-sm text-gray-500">{BRAND_NAME}</p>
        </div>

        <p className="text-sm text-gray-700">
          This Privacy Policy explains what information {BRAND_NAME} collects from guests booking a
          stay at one of our managed short-term rental properties, and how that information is used.
        </p>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-900">Information we collect</h2>
          <p className="text-sm text-gray-700">
            When you book a reservation with us — directly through hfproperties.net, or through a
            platform such as Airbnb or VRBO — we collect information necessary to manage your stay,
            including your name, email address, phone number, and reservation details (property,
            dates, and any special requests).
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-900">How we use your information</h2>
          <p className="text-sm text-gray-700">
            We use your contact information to send you reservation-related communications, including
            booking confirmations, check-in instructions, door/access codes, WiFi and property
            information, and other messages related to your stay. If you provide a phone number, we
            may send you text (SMS) messages for these purposes. Message frequency varies based on
            your reservation activity.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-900">SMS opt-in data</h2>
          <p className="text-sm font-medium text-gray-900">
            We do not sell or share your SMS opt-in data or personal information with third parties for
            marketing purposes.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-900">Contact us</h2>
          <p className="text-sm text-gray-700">
            Questions about this policy or your information? Contact {SUPPORT_NAME} at{" "}
            <a href={`tel:${SUPPORT_PHONE}`} className="underline">
              {SUPPORT_PHONE}
            </a>
            .
          </p>
        </div>

        <p className="text-xs text-gray-400">Last updated September 2026.</p>
      </div>
    </div>
  );
}
