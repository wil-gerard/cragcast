import { useEffect, useMemo, useState } from "react";
import { ConditionCard } from "./components/ConditionCard";
import { DeveloperNotes } from "./components/DeveloperNotes";
import { LocationSearch } from "./components/LocationSearch";
import { WeatherFactorGrid } from "./components/WeatherFactorGrid";
import { WeatherSummary } from "./components/WeatherSummary";
import { WhyThisRating } from "./components/WhyThisRating";
import { appCopy, defaultClimbLocation } from "./data/sampleLocation";
import { getClimbingConditionScore } from "./lib/climbingScore";
import { fetchClimbWeather, getMockClimbWeather } from "./lib/xweather";
import type { ClimbLocation, ClimbWeather } from "./types/weather";

type LoadState =
  | { status: "idle"; weather: null; error: null }
  | { status: "loading"; weather: ClimbWeather | null; error: null }
  | { status: "ready"; weather: ClimbWeather; error: null }
  | { status: "error"; weather: ClimbWeather; error: string };

export default function App() {
  const [locationInput, setLocationInput] = useState("");
  const [selectedLocation, setSelectedLocation] =
    useState<ClimbLocation>(defaultClimbLocation);
  const [state, setState] = useState<LoadState>({
    status: "idle",
    weather: null,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    setState((currentState) => ({
      status: "loading",
      weather: currentState.weather,
      error: null,
    }));

    fetchClimbWeather(selectedLocation)
      .then((weather) => {
        if (isMounted) {
          setState({ status: "ready", weather, error: null });
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setState({
            status: "error",
            weather: getMockClimbWeather(selectedLocation, true),
            error:
              error instanceof Error
                ? error.message
                : "Unable to load weather data.",
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedLocation]);

  const weather = state.weather;
  const isInitialLoading = state.status === "loading" && !weather;
  const isRefreshing = state.status === "loading" && Boolean(weather);
  const score = useMemo(
    () => (weather ? getClimbingConditionScore(weather) : null),
    [weather],
  );

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <div className="brand-row">
            <strong>{appCopy.name}</strong>
          </div>
          <p className="eyebrow">Location-based climbing weather</p>
          <h1>Climb score for any location</h1>
          <p>{appCopy.subtitle}</p>
        </div>
      </header>

      <LocationSearch
        value={locationInput}
        onValueChange={setLocationInput}
        onSelectLocation={setSelectedLocation}
      />

      <div className="search-status" aria-live="polite" data-visible={isRefreshing}>
        {isRefreshing ? (
          <>
            <span className="status-dot" aria-hidden="true" />
            Checking {selectedLocation.label}
            <span className="status-ellipsis" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </>
        ) : (
          <span aria-hidden="true">&nbsp;</span>
        )}
      </div>

      {isInitialLoading && (
        <section className="loading-panel">
          <p className="eyebrow">Loading</p>
          <h2>Checking conditions for {selectedLocation.label}...</h2>
          <div className="loading-grid" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
        </section>
      )}

      {state.error && (
        <section className="notice" role="status">
          Live weather data could not be loaded — showing estimated conditions
          instead. {state.error}
        </section>
      )}

      {weather && score && (
        <section className="results-region" aria-busy={isRefreshing}>
          <ConditionCard
            isRefreshing={isRefreshing}
            score={score}
            weather={weather}
          />
          <WhyThisRating score={score} />
          <WeatherSummary weather={weather} />
          <WeatherFactorGrid weather={weather} />
          <DeveloperNotes />
        </section>
      )}
    </main>
  );
}
