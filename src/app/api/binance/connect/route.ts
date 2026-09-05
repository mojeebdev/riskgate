import { NextResponse } from "next/server";
import { createBinanceAuthorizationUrl, isOwnerConnectRequest } from "@/lib/binance/oauth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isOwnerConnectRequest(request))) {
    return NextResponse.json({ error: "Owner authorization is required." }, { status: 401 });
  }

  try {
    return NextResponse.json({ authorizationUrl: await createBinanceAuthorizationUrl(request) });
  } catch {
    return NextResponse.json({ error: "Binance OAuth is not configured." }, { status: 503 });
  }
}
