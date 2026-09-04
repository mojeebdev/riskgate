import { describe, expect, it } from "vitest";
import { compilePolicy, parsePolicyResponse } from "./policy-compiler";

describe("compilePolicy", () => {
  it("compiles clear limits without requiring an AI provider", async () => {
    const { policy, source } = await compilePolicy(
      "Only BTC and ETH. Keep each order under $4,000, exposure below 20%, no leverage, and slippage under 25 bps.",
    );

    expect(source).toBe("deterministic");
    expect(policy.allowedAssets).toEqual(["BTC", "ETH"]);
    expect(policy.maxOrderUsd).toBe(4_000);
    expect(policy.maxPortfolioExposurePct).toBe(20);
    expect(policy.maxSlippageBps).toBe(25);
    expect(policy.maxLeverage).toBe(1);
  });

  it("accepts JSON wrapped in a model markdown fence", () => {
    const policy = parsePolicyResponse(`Here is the policy:\n\`\`\`json
      {
        "allowedAssets": ["BTC"],
        "maxOrderUsd": 2000,
        "maxPortfolioExposurePct": 15,
        "maxSlippageBps": 20,
        "maxLeverage": 1,
        "approvalThresholdUsd": 1000
      }
    \`\`\``);

    expect(policy.allowedAssets).toEqual(["BTC"]);
    expect(policy.maxOrderUsd).toBe(2_000);
  });
});
