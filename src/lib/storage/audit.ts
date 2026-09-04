import type { Evaluation, MarketSnapshot, OrderIntent, RiskPolicy } from "@/lib/risk/types";

type D1Statement = {
  bind: (...values: unknown[]) => D1Statement;
  run: () => Promise<unknown>;
};

type D1DatabaseLike = {
  prepare: (query: string) => D1Statement;
};

export async function recordEvaluation(input: {
  policy: RiskPolicy;
  intent: OrderIntent;
  market: MarketSnapshot;
  evaluation: Evaluation;
}) {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    const db = (env as unknown as { DB?: D1DatabaseLike }).DB;
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
