import type {
  Evaluation,
  MarketSnapshot,
  OrderIntent,
  RiskPolicy,
  RuleResult,
} from "./types";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function evaluateRisk(
  policy: RiskPolicy,
  intent: OrderIntent,
  market: MarketSnapshot,
): Evaluation {
  const baseAsset = intent.symbol.replace(/(USDT|USDC|FDUSD|BTC|ETH)$/i, "");
  const assetAllowed = policy.allowedAssets.some(
    (asset) => asset.toUpperCase() === baseAsset.toUpperCase(),
  );

  const rules: RuleResult[] = [
    {
      id: "asset",
      label: "Asset allowlist",
      outcome: assetAllowed ? "pass" : "fail",
      evidence: assetAllowed
        ? `${baseAsset} is permitted by this policy.`
        : `${baseAsset} is outside the ${policy.allowedAssets.join(", ")} allowlist.`,
    },
    {
      id: "order-size",
      label: "Order size",
      outcome:
        intent.notionalUsd > policy.maxOrderUsd
          ? "fail"
          : intent.notionalUsd > policy.approvalThresholdUsd
            ? "review"
            : "pass",
      evidence: `${money.format(intent.notionalUsd)} proposed · ${money.format(policy.maxOrderUsd)} hard cap.`,
    },
    {
      id: "exposure",
      label: "Portfolio exposure",
      outcome:
        intent.projectedExposurePct > policy.maxPortfolioExposurePct
          ? "fail"
          : "pass",
      evidence: `${intent.projectedExposurePct}% projected · ${policy.maxPortfolioExposurePct}% maximum.`,
    },
    {
      id: "leverage",
      label: "Leverage",
      outcome: intent.leverage > policy.maxLeverage ? "fail" : "pass",
      evidence: `${intent.leverage}× requested · ${policy.maxLeverage}× maximum.`,
    },
    {
      id: "slippage",
      label: "Market slippage",
      outcome:
        market.expectedSlippageBps > policy.maxSlippageBps ? "fail" : "pass",
      evidence: `${market.expectedSlippageBps} bps estimated · ${policy.maxSlippageBps} bps maximum.`,
    },
  ];

  const failed = rules.filter((rule) => rule.outcome === "fail");
  const needsReview = rules.some((rule) => rule.outcome === "review");
  const decision = failed.length
    ? "blocked"
    : needsReview
      ? "approval_required"
      : "allow";

  const summary =
    decision === "blocked"
      ? `Blocked by ${failed.length} ${failed.length === 1 ? "policy rule" : "policy rules"}. No execution request was created.`
      : decision === "approval_required"
        ? "Policy permits this order only after human approval."
        : "All policy checks passed. This proposal is approval-ready.";

  return {
    id: crypto.randomUUID(),
    decision,
    summary,
    rules,
    evaluatedAt: new Date().toISOString(),
  };
}
