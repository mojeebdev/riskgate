import { z } from "zod";

export const policySchema = z.object({
  allowedAssets: z.array(z.string().min(2)).min(1),
  maxOrderUsd: z.number().positive(),
  maxPortfolioExposurePct: z.number().min(0).max(100),
  maxSlippageBps: z.number().min(0),
  maxLeverage: z.number().min(1),
  approvalThresholdUsd: z.number().positive(),
});

export const orderIntentSchema = z.object({
  symbol: z.string().min(5),
  side: z.enum(["BUY", "SELL"]),
  orderType: z.enum(["MARKET", "LIMIT"]),
  notionalUsd: z.number().positive(),
  currentExposurePct: z.number().min(0).max(100),
  projectedExposurePct: z.number().min(0).max(100),
  leverage: z.number().min(1),
});

export const marketSnapshotSchema = z.object({
  symbol: z.string(),
  price: z.number().positive(),
  bestBid: z.number().positive(),
  bestAsk: z.number().positive(),
  expectedSlippageBps: z.number().min(0),
  source: z.enum(["binance-agent-os", "demo"]),
  capturedAt: z.string(),
});

export const evaluationInputSchema = z.object({
  policy: policySchema,
  intent: orderIntentSchema,
  market: marketSnapshotSchema,
});

export type RiskPolicy = z.infer<typeof policySchema>;
export type OrderIntent = z.infer<typeof orderIntentSchema>;
export type MarketSnapshot = z.infer<typeof marketSnapshotSchema>;
export type Decision = "allow" | "approval_required" | "blocked";

export type RuleResult = {
  id: "asset" | "order-size" | "exposure" | "leverage" | "slippage";
  label: string;
  outcome: "pass" | "review" | "fail";
  evidence: string;
};

export type Evaluation = {
  id: string;
  decision: Decision;
  summary: string;
  rules: RuleResult[];
  evaluatedAt: string;
};
