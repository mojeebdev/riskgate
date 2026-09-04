import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAgentOsMarketSnapshot,
  getDemoMarketSnapshot,
} from "@/lib/binance/agent-os";
import { evaluateRisk } from "@/lib/risk/policy-engine";
import { orderIntentSchema, policySchema } from "@/lib/risk/types";
import { recordEvaluation } from "@/lib/storage/audit";

export const runtime = "nodejs";

const requestSchema = z.object({
  policy: policySchema,
  intent: orderIntentSchema,
});

export async function POST(request: Request) {
  try {
    const { policy, intent } = requestSchema.parse(await request.json());
    let market;
    let connectionNote: string | null = null;

    try {
      market = await Promise.race([
        getAgentOsMarketSnapshot(intent.symbol),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Agent OS timeout")), 5_000),
        ),
      ]);
    } catch (error) {
      market = getDemoMarketSnapshot(intent.symbol, intent.notionalUsd);
      connectionNote =
        error instanceof Error
          ? `${error.message} Showing an explicitly labeled demo snapshot.`
          : "Agent OS unavailable. Showing an explicitly labeled demo snapshot.";
    }

    const evaluation = evaluateRisk(policy, intent, market);
    const persisted = await recordEvaluation({
      policy,
      intent,
      market,
      evaluation,
    });

    return NextResponse.json({
      evaluation,
      market,
      persisted,
      connectionNote,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "The proposed action or policy is invalid.", details: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "RiskGate could not evaluate this action." },
      { status: 500 },
    );
  }
}
