import { NextResponse } from "next/server";
import { getBinanceConnection } from "@/lib/binance/oauth";

export const runtime = "nodejs";

export async function GET() {
  const connection = await getBinanceConnection();
  return NextResponse.json(
    {
      connected: connection.status === "connected",
      status: connection.status,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
