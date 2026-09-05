import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { MarketSnapshot } from "@/lib/risk/types";

const ENDPOINT =
  process.env.BINANCE_AGENT_OS_MCP_URL ??
  "https://agent.binance.com/mcp/agentic";

type McpTool = {
  name: string;
  description?: string;
  inputSchema?: {
    properties?: Record<string, unknown>;
  };
};

function toolScore(tool: McpTool) {
  const text = `${tool.name} ${tool.description ?? ""}`.toLowerCase();
  if (/\b(place|execute|cancel|trade|order\s+submit)\b/.test(text) && !/order.?book|depth/.test(text)) return -1;
  if (/order.?book|depth/.test(text)) return 4;
  if (/ticker|price|quote/.test(text)) return 2;
  return 0;
}

function buildArguments(tool: McpTool, symbol: string) {
  const properties = tool.inputSchema?.properties ?? {};
  const args: Record<string, unknown> = {};

  for (const key of Object.keys(properties)) {
    const normalised = key.toLowerCase();
    if (normalised === "symbol" || normalised.endsWith("symbol")) {
      args[key] = symbol;
    } else if (normalised === "symbols") {
      args[key] = [symbol];
    } else if (normalised.includes("limit")) {
      args[key] = 20;
    } else if (normalised.includes("market") || normalised.includes("type")) {
      args[key] = "spot";
    }
  }

  return args;
}

function parsePayload(result: unknown): unknown {
  if (!result || typeof result !== "object") return result;
  const record = result as Record<string, unknown>;
  if (record.structuredContent) return record.structuredContent;
  if (!Array.isArray(record.content)) return result;

  for (const item of record.content) {
    if (!item || typeof item !== "object") continue;
    const block = item as Record<string, unknown>;
    if (block.type === "text" && typeof block.text === "string") {
      try {
        return JSON.parse(block.text);
      } catch {
        continue;
      }
    }
  }
  return result;
}

function walk(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const direct = Object.entries(record).find(
    ([candidate]) => candidate.toLowerCase() === key.toLowerCase(),
  );
  if (direct) return direct[1];
  for (const child of Object.values(record)) {
    const found = walk(child, key);
    if (found !== undefined) return found;
  }
  return undefined;
}

function numberFrom(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function priceLevel(value: unknown): number | undefined {
  if (!Array.isArray(value) || !value.length) return undefined;
  const first = value[0];
  if (Array.isArray(first)) return numberFrom(first[0]);
  if (first && typeof first === "object") {
    return numberFrom(
      (first as Record<string, unknown>).price ??
        (first as Record<string, unknown>).p,
    );
  }
  return undefined;
}

function snapshotFromPayload(payload: unknown, symbol: string): MarketSnapshot {
  const bestBid =
    priceLevel(walk(payload, "bids")) ??
    numberFrom(walk(payload, "bidPrice"));
  const bestAsk =
    priceLevel(walk(payload, "asks")) ??
    numberFrom(walk(payload, "askPrice"));
  const lastPrice =
    numberFrom(walk(payload, "price")) ??
    numberFrom(walk(payload, "lastPrice"));
  const price = lastPrice ?? (bestBid && bestAsk ? (bestBid + bestAsk) / 2 : 0);

  if (!price) throw new Error("Agent OS returned no readable market price.");

  const bid = bestBid ?? price;
  const ask = bestAsk ?? price;
  const spreadBps = Math.max(1, Math.round(((ask - bid) / price) * 10_000));

  return {
    symbol,
    price,
    bestBid: bid,
    bestAsk: ask,
    expectedSlippageBps: spreadBps,
    source: "binance-agent-os",
    capturedAt: new Date().toISOString(),
  };
}

export async function getAgentOsMarketSnapshot(
  symbol: string,
  accessToken: string,
): Promise<MarketSnapshot> {
  const client = new Client({ name: "riskgate", version: "0.1.0" });
  const transport = new StreamableHTTPClientTransport(new URL(ENDPOINT), {
    requestInit: { headers: { authorization: `Bearer ${accessToken}` } },
  });

  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    const marketTool = [...tools]
      .map((tool) => tool as McpTool)
      .sort((a, b) => toolScore(b) - toolScore(a))
      .find((tool) => toolScore(tool) > 0);

    if (!marketTool) throw new Error("No public market-data tool is available.");

    const result = await client.callTool({
      name: marketTool.name,
      arguments: buildArguments(marketTool, symbol),
    });
    return snapshotFromPayload(parsePayload(result), symbol);
  } finally {
    await transport.close().catch(() => undefined);
  }
}

export function getDemoMarketSnapshot(
  symbol: string,
  notionalUsd: number,
): MarketSnapshot {
  const price = symbol.startsWith("ETH") ? 4_320 : 110_240;
  const expectedSlippageBps = notionalUsd > 5_000 ? 48 : 8;
  return {
    symbol,
    price,
    bestBid: price - 2,
    bestAsk: price + 2,
    expectedSlippageBps,
    source: "demo",
    capturedAt: new Date().toISOString(),
  };
}
