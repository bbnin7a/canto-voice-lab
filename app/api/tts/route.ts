import { NextResponse } from "next/server";
import { synthesizeResponse } from "../../../src/server/api";
import type { TtsRequestBody } from "../../../src/shared/providerTypes";

export async function POST(request: Request) {
  const result = await synthesizeResponse((await request.json()) as TtsRequestBody);
  return NextResponse.json(result.payload, { status: result.status });
}
