const BRAND_NAME = "Howell Family Enterprises";
const SUPPORT_NAME = "April Patal";
const SUPPORT_PHONE = "405-215-9866";

// Public, no login required (see src/proxy.ts's isLegalRoute) - the
// "Terms & Conditions" page Twilio's A2P 10DLC campaign form requires,
// containing the SMS Terms section it specifically checks for. Required
// elements per Twilio's own form: titled "Terms & Conditions" or "Terms
// of Service", an SMS Terms section, the "message and data rates may
// apply" disclosure, and the registered Brand name - plus the standard
// program description/frequency/HELP/STOP/carrier-liability language
// campaign vetting expects, and a link back to the Privacy Policy.
export default function SmsTermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-6 rounded-lg border border-gray-200 bg-white p-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Terms & Conditions</h1>
          <p className="mt-1 text-sm text-gray-500">{BRAND_NAME}</p>
        </div>

        <p className="text-sm text-gray-700">
          These Terms & Conditions govern your use of communications, including text messages, sent by{" "}
          {BRAND_NAME} in connection with a reservation at one of our managed short-term rental
          properties.
        </p>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-900">SMS Terms</h2>

          <p className="text-sm text-gray-700">
            <span className="font-medium text-gray-900">Program description:</span> By providing your
            phone number when booking a reservation with {BRAND_NAME} (directly through
            hfproperties.net, or through a platform such as Airbnb or VRBO), you consent to receive SMS
            text messages related to your stay — including booking confirmations, check-in
            instructions, door/access codes, WiFi and property information, and other reservation-related
            communications. These are service messages related to your reservation, not marketing or
            promotional messages.
          </p>

          <p className="text-sm text-gray-700">
            <span className="font-medium text-gray-900">Message frequency:</span> Message frequency
            varies based on your reservation activity.
          </p>

          <p className="text-sm text-gray-700">
            <span className="font-medium text-gray-900">Message and data rates may apply.</span>
          </p>

          <p className="text-sm text-gray-700">
            <span className="font-medium text-gray-900">Opting out:</span> Reply STOP at any time to
            stop receiving text messages. You may receive one final message confirming your opt-out.
          </p>

          <p className="text-sm text-gray-700">
            <span className="font-medium text-gray-900">Getting help:</span> Reply HELP for help, or
            contact {SUPPORT_NAME} at{" "}
            <a href={`tel:${SUPPORT_PHONE}`} className="underline">
              {SUPPORT_PHONE}
            </a>
            .
          </p>

          <p className="text-sm text-gray-700">
            <span className="font-medium text-gray-900">Carrier liability:</span> Carriers are not
            liable for delayed or undelivered messages.
          </p>
        </div>

        <p className="text-sm text-gray-700">
          For details on how we handle your information, see our{" "}
          <a href="/privacy" className="underline">
            Privacy Policy
          </a>
          .
        </p>

        <p className="text-xs text-gray-400">Last updated September 2026.</p>
      </div>
    </div>
  );
}
