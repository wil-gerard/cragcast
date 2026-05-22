import { type FormEvent, useEffect, useMemo, useState } from "react";
import { ConditionCard } from "./components/ConditionCard";
import { DeveloperNotes } from "./components/DeveloperNotes";
import { WeatherFactorGrid } from "./components/WeatherFactorGrid";
import { WhyThisRating } from "./components/WhyThisRating";
import { appCopy, defaultClimbLocation } from "./data/sampleLocation";
import { getClimbingConditionScore } from "./lib/climbingScore";
import { fetchClimbWeather, getMockClimbWeather } from "./lib/xweather";
import type { ClimbLocation, ClimbWeather } from "./types/weather";

type LoadState =
  | { status: "loading"; weather: null; error: null }
  | { status: "ready"; weather: ClimbWeather; error: null }
  | { status: "error"; weather: ClimbWeather; error: string };

export default function App() {
  const [locationInput, setLocationInput] = useState(defaultClimbLocation.query);
  const [selectedLocation, setSelectedLocation] =
    useState<ClimbLocation>(defaultClimbLocation);
  const [state, setState] = useState<LoadState>({
    status: "loading",
    weather: null,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    setState({ status: "loading", weather: null, error: null });

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
                : "Unable to load Xweather data.",
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedLocation]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedLocation = locationInput.trim();

    if (!trimmedLocation) {
      return;
    }

    setSelectedLocation({
      query: trimmedLocation,
      label: trimmedLocation,
    });
  }

  const weather = state.weather;
  const score = useMemo(
    () => (weather ? getClimbingConditionScore(weather) : null),
    [weather],
  );

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Location-based climbing weather</p>
          <h1>{appCopy.name}</h1>
          <p>{appCopy.subtitle}</p>
        </div>
        <div className="api-badge">
          <span>Xweather starter</span>
          <strong>One-page demo</strong>
        </div>
      </header>

      <form className="location-form" onSubmit={handleSubmit}>
        <label htmlFor="location">Climb location</label>
        <div>
          <input
            id="location"
            name="location"
            placeholder="Try: Red River Gorge, KY"
            value={locationInput}
            onChange={(event) => setLocationInput(event.target.value)}
          />
          <button type="submit">Score climb</button>
        </div>
      </form>

      {state.status === "loading" && (
        <section className="loading-panel">
          <p className="eyebrow">Loading</p>
          <h2>Checking conditions for {selectedLocation.label}...</h2>
        </section>
      )}

      {state.error && (
        <section className="notice" role="status">
          Live Xweather data could not be loaded, so the app is showing mock
          starter data. {state.error}
        </section>
      )}

      {weather && score && (
        <>
          <ConditionCard
            score={score}
            weather={weather}
          />
          <WeatherFactorGrid weather={weather} />
          <WhyThisRating score={score} />
          <DeveloperNotes />
        </>
      )}
    </main>
  );
}
