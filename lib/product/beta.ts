export const PRODUCT_NAME = "Cohost AI";

export const CLOSED_BETA_MAX_TENANTS = 10;
const DEFAULT_CLOSED_BETA_MAX_ACTIVE_LISTINGS = 30;
const DEFAULT_CLOSED_BETA_MIN_ACTIVE_LISTINGS = 0;

function parseIntegerEnv(name: string, fallback: number, minValue: number) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < minValue) {
    return fallback;
  }

  return parsed;
}

export const CLOSED_BETA_MAX_ACTIVE_LISTINGS = parseIntegerEnv(
  "NEXT_PUBLIC_CLOSED_BETA_MAX_ACTIVE_LISTINGS",
  DEFAULT_CLOSED_BETA_MAX_ACTIVE_LISTINGS,
  1,
);
export const CLOSED_BETA_MIN_ACTIVE_LISTINGS = Math.min(
  parseIntegerEnv(
    "NEXT_PUBLIC_CLOSED_BETA_MIN_ACTIVE_LISTINGS",
    DEFAULT_CLOSED_BETA_MIN_ACTIVE_LISTINGS,
    0,
  ),
  CLOSED_BETA_MAX_ACTIVE_LISTINGS,
);

export const CLOSED_BETA_LABEL = "Closed beta";

export function formatClosedBetaListingScope() {
  if (CLOSED_BETA_MIN_ACTIVE_LISTINGS > 0) {
    return `${CLOSED_BETA_MIN_ACTIVE_LISTINGS}-${CLOSED_BETA_MAX_ACTIVE_LISTINGS} active listings per client`;
  }

  return `up to ${CLOSED_BETA_MAX_ACTIVE_LISTINGS} active listings per client`;
}

export function formatClosedBetaSummary() {
  return `${CLOSED_BETA_LABEL}: up to ${CLOSED_BETA_MAX_TENANTS} clients, ${formatClosedBetaListingScope()}, free during beta.`;
}
