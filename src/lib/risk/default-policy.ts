import type { RiskPolicy } from "./types";

export const DEFAULT_POLICY: RiskPolicy = {
  allowedAssets: ["BTC", "ETH"],
  maxOrderUsd: 5_000,
  maxPortfolioExposurePct: 25,
  maxSlippageBps: 35,
  maxLeverage: 1,
  approvalThresholdUsd: 3_000,
};
