// Hardcoded, uniform across every property for now - matches the prices
// in the user's own SuiteOp screenshots (Early Check-In / Late Check-Out
// $20/$30/$45, add-ons $20 each or $40 for Both). The *times* SuiteOp
// showed were fixed clock times assuming a different base checkout hour
// than this account's real 10am standard, so these are modeled as round
// hour-offsets from each reservation's actual check-in/out instead - an
// assumption flagged for correction, not silently guessed past. A
// per-property tier editor is a natural follow-up, not v1.

export type UpgradeTier = {
  key: string;
  label: string;
  priceCents: number;
};

export type EarlyCheckinTier = UpgradeTier & { hoursEarly: number };
export type LateCheckoutTier = UpgradeTier & { hoursLate: number };

export const EARLY_CHECKIN_TIERS: EarlyCheckinTier[] = [
  { key: "early_2", label: "Early Check-In", priceCents: 2000, hoursEarly: 2 },
  { key: "early_3", label: "Extended Early Check-In", priceCents: 3000, hoursEarly: 3 },
  { key: "early_4", label: "Super Early Check-In", priceCents: 4500, hoursEarly: 4 },
];

export const LATE_CHECKOUT_TIERS: LateCheckoutTier[] = [
  { key: "late_1", label: "Late Check-Out", priceCents: 2000, hoursLate: 1 },
  { key: "late_2", label: "Extended Check-Out", priceCents: 3000, hoursLate: 2 },
  { key: "late_4", label: "Super Late Check-Out", priceCents: 4500, hoursLate: 4 },
];

export const ADDON_TIERS: UpgradeTier[] = [
  { key: "high_chair", label: "High Chair", priceCents: 2000 },
  { key: "pack_n_play", label: "Pack N' Play", priceCents: 2000 },
  { key: "both", label: "High Chair + Pack N' Play", priceCents: 4000 },
];

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}
