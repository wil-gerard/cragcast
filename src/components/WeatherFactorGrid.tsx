import type { ClimbWeather } from "../types/weather";

type WeatherFactorGridProps = {
  weather: ClimbWeather;
};

export function WeatherFactorGrid({ weather }: WeatherFactorGridProps) {
  const maxPrecipChance = Math.max(
    ...weather.forecastNextHours.map((period) => period.precipChance ?? 0),
  );
  const activeAlerts = weather.alerts.filter((alert) => alert.active);

  const factors = [
    {
      label: "Temperature",
      value: formatTemp(weather.current.tempF),
      note: "Caution below 35F or above 90F",
    },
    {
      label: "Wind",
      value: formatWind(weather.current.windMph),
      note: "Caution above 25 mph",
    },
    {
      label: "Precip chance",
      value: `${maxPrecipChance}%`,
      note: "Highest hourly chance in the next 6 hours",
    },
    {
      label: "Recent precip",
      value: formatRecentPrecip(weather.recentPrecip),
      note: sourceLabel(weather.recentPrecip.source),
    },
    {
      label: "Active alerts",
      value: activeAlerts.length ? String(activeAlerts.length) : "None",
      note: activeAlerts[0]?.title ?? "No active alerts returned",
    },
    {
      label: "Lightning risk",
      value: weather.threats.lightningOrThunderstormRisk ? "Flagged" : "Not flagged",
      note: weather.threats.summary ?? sourceLabel(weather.threats.source),
    },
  ];

  return (
    <section className="factor-grid" aria-label="Weather factors">
      {factors.map((factor) => (
        <article className="factor-card" key={factor.label}>
          <p>{factor.label}</p>
          <strong>{factor.value}</strong>
          <span>{factor.note}</span>
        </article>
      ))}
    </section>
  );
}

function formatTemp(value: number | null) {
  return value === null ? "Unavailable" : `${Math.round(value)}F`;
}

function formatWind(value: number | null) {
  return value === null ? "Unavailable" : `${Math.round(value)} mph`;
}

function formatRecentPrecip(precip: ClimbWeather["recentPrecip"]) {
  if (precip.inches === null && !precip.trace) return "Unavailable";
  if (precip.trace) return "Trace";
  return `${precip.inches?.toFixed(2)} in`;
}

function sourceLabel(source: string) {
  if (source === "unavailable") return "Endpoint unavailable or not included";
  if (source === "mock") return "Mock starter data";
  if (source === "forecast") return "Inferred from hourly forecast";
  return "Xweather data";
}
