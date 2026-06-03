import type { ClimbWeather } from "../types/weather";

type WeatherSummaryProps = {
  weather: ClimbWeather;
};

export function WeatherSummary({ weather }: WeatherSummaryProps) {
  const summary = weather.phraseSummary;

  return (
    <section className="panel weather-summary">
      <div className="section-heading">
        <p className="eyebrow">Weather summary</p>
        <h2>Conditions overview</h2>
      </div>
      {summary.text ? (
        <p>{summary.text}</p>
      ) : (
        <p>
          A narrative summary is unavailable for this location. The climb score
          still reflects current observations, forecast, alerts, recent
          precipitation, and threat data.
        </p>
      )}
      <span>
        {summary.source === "phrases"
          ? "Narrative powered by Xweather."
          : summary.source === "mock"
            ? "Estimated conditions — live data not available."
            : "Narrative data not returned for this request."}
      </span>
    </section>
  );
}
