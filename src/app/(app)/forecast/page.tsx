import type { Metadata } from "next";
import { getActiveUser } from "@/lib/auth";
import { getForecasts } from "@/lib/ai/forecast";
import { ForecastView } from "@/components/forecast/forecast-view";

export const metadata: Metadata = {
  title: "Forecast | MoneyFlow AI",
};

export default async function ForecastPage() {
  const user = await getActiveUser();
  const forecasts = await getForecasts(user.id, "baseline");

  return <ForecastView initialForecasts={forecasts} currency={user.currency} />;
}
