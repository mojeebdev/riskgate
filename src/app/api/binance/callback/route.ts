import { NextResponse } from "next/server";
import { finishBinanceAuthorization } from "@/lib/binance/oauth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const callbackUrl = new URL(request.url);
  if (callbackUrl.searchParams.has("error")) {
    return NextResponse.redirect(new URL("/?binance=declined#gate", callbackUrl.origin));
  }

  try {
    await finishBinanceAuthorization(request);
    return NextResponse.redirect(new URL("/?binance=connected#gate", callbackUrl.origin));
  } catch {
    return NextResponse.redirect(new URL("/?binance=failed#gate", callbackUrl.origin));
  }
}
