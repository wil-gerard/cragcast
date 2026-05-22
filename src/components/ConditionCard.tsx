import { appCopy } from "../data/sampleLocation";
import type { ClimbingConditionScore, ClimbWeather } from "../types/weather";

type ConditionCardProps = {
  score: ClimbingConditionScore;
  weather: ClimbWeather;
};

export function ConditionCard({ score, weather }: ConditionCardProps) {
  return (
    <section className={`condition-card status-${score.status.toLowerCase().replaceAll(" ", "-")}`}>
      <div>
        <p className="eyebrow">{weather.location.label}</p>
        <h2>{score.status}</h2>
        <p className="headline">{score.headline}</p>
      </div>
      <div className="condition-meta">
        <span>{formatObservedTime(weather.observedAtISO)}</span>
        <span>{weather.meta.source === "mock" ? "Mock data" : "Live Xweather data"}</span>
      </div>
      <p className="disclaimer">{appCopy.disclaimer}</p>
    </section>
  );
}

function formatObservedTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}
