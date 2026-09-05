import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return NextResponse.json(
    {
      client_name: "RiskGate",
      application_type: "web",
      redirect_uris: [new URL("/api/binance/callback", origin).toString()],
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
