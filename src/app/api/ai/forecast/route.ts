import { NextRequest, NextResponse } from "next/server";
import { getActiveUser } from "@/lib/auth";
import { forecastSchema } from "@/lib/validations/ai";
import { getForecasts, generateForecast } from "@/lib/ai/forecast";

export async function GET(request: NextRequest) {
  const user = await getActiveUser();
  const scenario = request.nextUrl.searchParams.get("scenario") ?? "baseline";
  const forecasts = await getForecasts(user.id, scenario);
  return NextResponse.json({ forecasts, scenario });
}

export async function POST(request: NextRequest) {
  const user = await getActiveUser();
  const body = await request.json().catch(() => ({}));
  const parsed = forecastSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const forecasts = await generateForecast(user.id, parsed.data.scenario);
  return NextResponse.json({ forecasts, scenario: parsed.data.scenario }, { status: 201 });
}
