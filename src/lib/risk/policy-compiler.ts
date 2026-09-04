import { policySchema, type RiskPolicy } from "./types";
import { DEFAULT_POLICY } from "./default-policy";

function deterministicCompile(instruction: string): RiskPolicy {
  const next = { ...DEFAULT_POLICY };
  const upper = instruction.toUpperCase();
  const assets = ["BTC", "ETH", "BNB", "SOL", "XRP"].filter((asset) =>
    new RegExp(`\\b${asset}\\b`).test(upper),
  );
  if (assets.length) next.allowedAssets = assets;

  const orderMatch = instruction.match(
    /(?:order|trade|position)[^$\d]{0,24}\$?([\d,]+(?:\.\d+)?)/i,
  );
  if (orderMatch) next.maxOrderUsd = Number(orderMatch[1].replaceAll(",", ""));

  const exposureMatch = instruction.match(/exposure[^\d]{0,20}(\d+(?:\.\d+)?)\s*%/i);
  if (exposureMatch) next.maxPortfolioExposurePct = Number(exposureMatch[1]);

  const slippageMatch = instruction.match(/slippage[^\d]{0,20}(\d+(?:\.\d+)?)\s*(?:bps|basis)/i);
  if (slippageMatch) next.maxSlippageBps = Number(slippageMatch[1]);

  const leverageMatch = instruction.match(/(?:leverage|max)[^\d]{0,20}(\d+(?:\.\d+)?)\s*[x×]/i);
  if (/no leverage/i.test(instruction)) next.maxLeverage = 1;
  else if (leverageMatch) next.maxLeverage = Number(leverageMatch[1]);

  next.approvalThresholdUsd = Math.min(
    next.approvalThresholdUsd,
    next.maxOrderUsd * 0.6,
  );
  return policySchema.parse(next);
}

export function parsePolicyResponse(content: string): RiskPolicy {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? content;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end <= start) {
    throw new Error("The configured policy model returned no JSON object.");
  }

  return policySchema.parse(JSON.parse(candidate.slice(start, end + 1)));
}

export async function compilePolicy(instruction: string) {
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL;
  const model = process.env.AI_MODEL;

  if (!apiKey || !baseUrl || !model) {
    return { policy: deterministicCompile(instruction), source: "deterministic" as const };
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 900,
      stream: false,
      messages: [
        {
          role: "system",
          content:
            "Translate the user's trading risk boundary into JSON only. Required fields: allowedAssets string[], maxOrderUsd number, maxPortfolioExposurePct number, maxSlippageBps number, maxLeverage number, approvalThresholdUsd number. Never loosen a stated boundary. Do not provide trading advice.",
        },
        { role: "user", content: instruction },
      ],
    }),
  });

  if (!response.ok) throw new Error("The configured policy model did not respond.");
  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error("The configured policy model returned no policy.");
  return { policy: parsePolicyResponse(content), source: "ai" as const };
}
