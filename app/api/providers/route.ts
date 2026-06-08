import { NextResponse } from "next/server";
import { providersResponse } from "../../../src/server/api";

export function GET() {
  return NextResponse.json(providersResponse());
}
