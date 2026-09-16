import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/upgradeTiers";
import ReviewActions from "./ReviewActions";

const CATEGORY_LABELS: Record<string, string> = {
  early_checkin: "Early Check-In",
  late_checkout: "Late Check-Out",
  addon: "Add-on",
};

// No-login staff review page (SuiteOp roadmap P4), linked from the
// #upsell Slack message - same access-control shape as /wo/[token] and
// /guest/[token]: the share_token itself is the only gate.
export default async function UpgradeReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const request = await prisma.upgradeRequest.findUnique({
    where: { share_token: token },
    include: { property: true },
  });

  if (!request) notFound();

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-md space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Upgrade Request</h1>
          <p className="text-sm text-gray-500">{CATEGORY_LABELS[request.category] ?? request.category}</p>
        </div>

        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Guest</span>
            <span className="font-medium text-gray-900">{request.guest_name ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Property</span>
            <span className="font-medium text-gray-900">{request.property.name_address}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Upsell</span>
            <span className="font-medium text-gray-900">{request.tier_label}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Price</span>
            <span className="font-medium text-gray-900">{formatPrice(request.price_cents)}</span>
          </div>
          {request.guest_note && (
            <div>
              <span className="text-gray-500">Note</span>
              <p className="mt-1 text-gray-900">{request.guest_note}</p>
            </div>
          )}
        </div>

        {request.status === "pending" ? (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <ReviewActions token={token} />
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
            Already {request.status}
            {request.decided_by_name ? ` by ${request.decided_by_name}` : ""}.
            {request.error && <p className="mt-2 text-xs text-red-600">{request.error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
