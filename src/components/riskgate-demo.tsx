"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  Evaluation,
  MarketSnapshot,
  OrderIntent,
  RiskPolicy,
} from "@/lib/risk/types";
import { DEFAULT_POLICY } from "@/lib/risk/default-policy";

const initialInstruction =
  "Only BTC and ETH. Keep orders under $5,000, exposure below 25%, no leverage, and slippage under 35 bps.";

const scenarios = {
  risky: {
    symbol: "BTCUSDT",
    side: "BUY",
    orderType: "MARKET",
    notionalUsd: 12_500,
    currentExposurePct: 18,
    projectedExposurePct: 38,
    leverage: 1,
  },
  safe: {
    symbol: "BTCUSDT",
    side: "BUY",
    orderType: "MARKET",
    notionalUsd: 2_400,
    currentExposurePct: 12,
    projectedExposurePct: 16,
    leverage: 1,
  },
} satisfies Record<string, OrderIntent>;

type ApiResult = {
  evaluation: Evaluation;
  market: MarketSnapshot;
  persisted: boolean;
  connectionNote: string | null;
};

type ConnectionStatus = "checking" | "connected" | "disconnected" | "expired" | "not_configured" | "unavailable";

function DecisionIcon({ decision }: { decision: Evaluation["decision"] }) {
  return <span className={`decision-icon ${decision}`}>{decision === "allow" ? "✓" : decision === "approval_required" ? "!" : "×"}</span>;
}

export function RiskGateDemo() {
  const [intent, setIntent] = useState<OrderIntent>(scenarios.risky);
  const [policy, setPolicy] = useState<RiskPolicy>(DEFAULT_POLICY);
  const [instruction, setInstruction] = useState(initialInstruction);
  const [compileState, setCompileState] = useState<"idle" | "loading" | "ai" | "deterministic">("idle");
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("checking");
  const quantity = useMemo(() => intent.notionalUsd / 110_240, [intent.notionalUsd]);

  useEffect(() => {
    let active = true;
    fetch("/api/binance/status")
      .then((response) => response.json())
      .then((data: { status?: ConnectionStatus }) => {
        if (active && data.status) setConnectionStatus(data.status);
      })
      .catch(() => {
        if (active) setConnectionStatus("unavailable");
      });
    return () => {
      active = false;
    };
  }, []);

  async function compile() {
    setCompileState("loading");
    setError(null);
    try {
      const response = await fetch("/api/policy/compile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ instruction }),
      });
      const data = (await response.json()) as {
        policy?: RiskPolicy;
        source?: "ai" | "deterministic";
        error?: string;
      };
      if (!response.ok || !data.policy || !data.source) {
        throw new Error(data.error ?? "Policy compilation failed.");
      }
      setPolicy(data.policy);
      setCompileState(data.source);
      setResult(null);
    } catch (reason) {
      setCompileState("idle");
      setError(reason instanceof Error ? reason.message : "Policy compilation failed.");
    }
  }

  async function evaluate() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ policy, intent }),
      });
      const data = (await response.json()) as ApiResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Evaluation failed.");
      setResult(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Evaluation failed.");
    } finally {
      setLoading(false);
    }
  }

  function chooseScenario(name: keyof typeof scenarios) {
    setIntent(scenarios[name]);
    setResult(null);
    setError(null);
  }

  return (
    <div className="demo-shell">
      <div className="demo-topbar">
        <div className="traffic-lights"><span /><span /><span /></div>
        <span>RiskGate / policy-console</span>
        <span className="mcp-state"><i /> {connectionStatus === "connected" ? "Live MCP connected" : connectionStatus === "checking" ? "Checking MCP…" : "MCP demo fallback"}</span>
      </div>

      <div className="policy-builder">
        <label htmlFor="policy-instruction">Describe the boundary</label>
        <div>
          <textarea id="policy-instruction" value={instruction} onChange={(event) => setInstruction(event.target.value)} rows={2} />
          <button onClick={compile} disabled={compileState === "loading"}>
            {compileState === "loading" ? "Compiling…" : "Compile policy"}
          </button>
        </div>
        <p>
          {compileState === "ai" ? "AI translated · deterministic engine enforces" : compileState === "deterministic" ? "Compiled locally · deterministic engine enforces" : "Provider-neutral AI adapter · deterministic fallback included"}
        </p>
      </div>

      <div className="scenario-tabs" role="group" aria-label="Demo scenarios">
        <button className={intent.notionalUsd > 5_000 ? "active" : ""} onClick={() => chooseScenario("risky")}>Risky proposal</button>
        <button className={intent.notionalUsd <= 5_000 ? "active" : ""} onClick={() => chooseScenario("safe")}>Compliant proposal</button>
      </div>

      <div className="demo-grid">
        <section className="policy-panel">
          <div className="panel-heading"><span>Active policy</span><b>Capital guard 01</b></div>
          <div className="policy-code">
            <p><span>allow</span> assets <b>[{policy.allowedAssets.join(", ")}]</b></p>
            <p><span>cap</span> order <b>${policy.maxOrderUsd.toLocaleString()}</b></p>
            <p><span>cap</span> exposure <b>{policy.maxPortfolioExposurePct}%</b></p>
            <p><span>deny</span> leverage <b>&gt; {policy.maxLeverage}×</b></p>
            <p><span>cap</span> slippage <b>{policy.maxSlippageBps} bps</b></p>
          </div>
          <p className="policy-footnote">Policy checks are deterministic. AI never decides the outcome.</p>
        </section>

        <section className="proposal-panel">
          <div className="panel-heading"><span>Agent proposal</span><b>{intent.side} {intent.symbol}</b></div>
          <label>
            Order value
            <span className="money-input"><i>$</i><input type="number" min="100" max="25000" step="100" value={intent.notionalUsd} onChange={(event) => setIntent({ ...intent, notionalUsd: Number(event.target.value) })} /></span>
          </label>
          <div className="proposal-facts">
            <span><small>Type</small>{intent.orderType}</span>
            <span><small>Est. qty</small>{quantity.toFixed(4)} BTC</span>
            <span><small>Projected exposure</small>{intent.projectedExposurePct}%</span>
          </div>
          <button className="evaluate-button" onClick={evaluate} disabled={loading}>
            {loading ? "Checking live evidence…" : "Evaluate before execution"}<span>↗</span>
          </button>
          <p className="safe-note"><span>◇</span> Simulation only. No order is sent to Binance.</p>
        </section>
      </div>

      {error && <div className="demo-error">{error}</div>}

      {result ? (
        <section className={`decision-panel ${result.evaluation.decision}`} aria-live="polite">
          <div className="decision-summary">
            <DecisionIcon decision={result.evaluation.decision} />
            <div>
              <small>RiskGate decision</small>
              <h3>{result.evaluation.decision.replace("_", " ")}</h3>
              <p>{result.evaluation.summary}</p>
            </div>
            <div className="market-source">
              <span className={result.market.source === "binance-agent-os" ? "live" : "demo"}>
                {result.market.source === "binance-agent-os" ? "Live evidence" : "Demo evidence"}
              </span>
              <b>${result.market.price.toLocaleString()}</b>
              <small>{result.market.expectedSlippageBps} bps slippage</small>
            </div>
          </div>
          <div className="rule-results">
            {result.evaluation.rules.map((rule) => (
              <div key={rule.id}>
                <span className={`rule-dot ${rule.outcome}`}>{rule.outcome === "pass" ? "✓" : rule.outcome === "review" ? "!" : "×"}</span>
                <p><b>{rule.label}</b><small>{rule.evidence}</small></p>
              </div>
            ))}
          </div>
          {result.connectionNote && <p className="connection-note">{result.connectionNote}</p>}
          <div className="receipt-row"><span>Receipt {result.evaluation.id.slice(0, 8)}</span><span>{result.persisted ? "Saved to D1" : "Local preview · D1 pending"}</span></div>
        </section>
      ) : (
        <div className="empty-decision"><span>↓</span><p>Run the proposal to see the rule-by-rule decision receipt.</p></div>
      )}
    </div>
  );
}
