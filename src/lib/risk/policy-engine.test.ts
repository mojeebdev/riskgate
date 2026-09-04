import { describe, expect, it } from "vitest";
import { evaluateRisk } from "./policy-engine";
import type { MarketSnapshot, OrderIntent, RiskPolicy } from "./types";

const policy: RiskPolicy = {
  allowedAssets: ["BTC", "ETH"],
  maxOrderUsd: 5_000,
  maxPortfolioExposurePct: 25,
  maxSlippageBps: 35,
  maxLeverage: 1,
  approvalThresholdUsd: 3_000,
};

const intent: OrderIntent = {
  symbol: "BTCUSDT",
  side: "BUY",
  orderType: "MARKET",
  notionalUsd: 2_400,
  currentExposurePct: 12,
  projectedExposurePct: 16,
  leverage: 1,
};

const market: MarketSnapshot = {
  symbol: "BTCUSDT",
  price: 110_240,
  bestBid: 110_238,
  bestAsk: 110_242,
  expectedSlippageBps: 8,
  source: "demo",
  capturedAt: "2026-09-04T00:00:00.000Z",
};

describe("evaluateRisk", () => {
  it("allows an order that passes every deterministic rule", () => {
    expect(evaluateRisk(policy, intent, market).decision).toBe("allow");
  });

  it("blocks an oversized and overexposed order", () => {
    const result = evaluateRisk(
      policy,
      { ...intent, notionalUsd: 12_500, projectedExposurePct: 38 },
      market,
    );

    expect(result.decision).toBe("blocked");
    expect(result.rules.filter((rule) => rule.outcome === "fail")).toHaveLength(2);
  });

  it("requires approval between the approval and hard limits", () => {
    expect(
      evaluateRisk(policy, { ...intent, notionalUsd: 4_000 }, market).decision,
    ).toBe("approval_required");
  });

  it("blocks when market evidence exceeds the slippage cap", () => {
    expect(
      evaluateRisk(policy, intent, { ...market, expectedSlippageBps: 48 })
        .decision,
    ).toBe("blocked");
  });
});
