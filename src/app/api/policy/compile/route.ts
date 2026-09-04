import { NextResponse } from "next/server";
import { z } from "zod";
import { compilePolicy } from "@/lib/risk/policy-compiler";

export const runtime = "nodejs";

const requestSchema = z.object({ instruction: z.string().min(12).max(1_000) });

export async function POST(request: Request) {
  try {
    const { instruction } = requestSchema.parse(await request.json());
    return NextResponse.json(await compilePolicy(instruction));
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? "Describe the policy in at least 12 characters."
        : error instanceof Error
          ? error.message
          : "RiskGate could not compile this policy.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
