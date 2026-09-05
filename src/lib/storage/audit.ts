import type { Evaluation, MarketSnapshot, OrderIntent, RiskPolicy } from "@/lib/risk/types";
import { getRuntimeBindings } from "@/lib/storage/d1";

export async function recordEvaluation(input: {
  policy: RiskPolicy;
  intent: OrderIntent;
  market: MarketSnapshot;
  evaluation: Evaluation;
}) {
  try {
    const db = (await getRuntimeBindings()).DB;
    if (!db) return false;

    await db
      .prepare(
        `INSERT INTO evaluations
          (id, symbol, side, order_type, notional_usd, decision, reasons_json,
           policy_json, market_snapshot_json, data_source, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        input.evaluation.id,
        input.intent.symbol,
        input.intent.side,
        input.intent.orderType,
        input.intent.notionalUsd,
        input.evaluation.decision,
        JSON.stringify(input.evaluation.rules),
        JSON.stringify(input.policy),
        JSON.stringify(input.market),
        input.market.source,
        input.evaluation.evaluatedAt,
      )
      .run();
    return true;
  } catch {
    return false;
  }
}
