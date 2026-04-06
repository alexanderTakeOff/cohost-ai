export const PRODUCT_NAME = "Cohost AI";

export const CLOSED_BETA_MAX_TENANTS = 10;
export const CLOSED_BETA_MAX_ACTIVE_LISTINGS = 30;

export const CLOSED_BETA_LABEL = "Closed beta";

export function formatClosedBetaSummary() {
  return `${CLOSED_BETA_LABEL}: up to ${CLOSED_BETA_MAX_TENANTS} clients, up to ${CLOSED_BETA_MAX_ACTIVE_LISTINGS} active listings per client, free during beta.`;
}
