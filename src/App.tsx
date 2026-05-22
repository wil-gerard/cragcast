import { type FormEvent, useEffect, useMemo, useState } from "react";
import { ConditionCard } from "./components/ConditionCard";
import { DeveloperNotes } from "./components/DeveloperNotes";
import { WeatherFactorGrid } from "./components/WeatherFactorGrid";
import { WhyThisRating } from "./components/WhyThisRating";
import { appCopy, defaultClimbLocation } from "./data/sampleLocation";
import { getClimbingConditionScore } from "./lib/climbingScore";
import {
  fetchClimbWeather,
  getMockClimbWeather,
  searchClimbLocations,
} from "./lib/xweather";
import type {
  ClimbLocation,
  ClimbLocationSuggestion,
  ClimbWeather,
} from "./types/weather";

type LoadState =
  | { status: "loading"; weather: null; error: null }
  | { status: "ready"; weather: ClimbWeather; error: null }
  | { status: "error"; weather: ClimbWeather; error: string };

export default function App() {
  const [locationInput, setLocationInput] = useState(defaultClimbLocation.query);
  const [selectedLocation, setSelectedLocation] =
    useState<ClimbLocation>(defaultClimbLocation);
  const [suggestions, setSuggestions] = useState<ClimbLocationSuggestion[]>([]);
  const [suggestionStatus, setSuggestionStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [isSuggestionListOpen, setIsSuggestionListOpen] = useState(false);
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

  useEffect(() => {
    const trimmedLocation = locationInput.trim();

    if (trimmedLocation.length < 2) {
      setSuggestions([]);
      setSuggestionStatus("idle");
      return;
    }

    let isMounted = true;
    setSuggestionStatus("loading");

    const timeout = window.setTimeout(() => {
      searchClimbLocations(trimmedLocation)
        .then((results) => {
          if (isMounted) {
            setSuggestions(results);
            setSuggestionStatus("ready");
          }
        })
        .catch(() => {
          if (isMounted) {
            setSuggestions([]);
            setSuggestionStatus("error");
          }
        });
    }, 250);

    return () => {
      isMounted = false;
      window.clearTimeout(timeout);
    };
  }, [locationInput]);

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
    setIsSuggestionListOpen(false);
  }

  function handleSuggestionSelect(suggestion: ClimbLocationSuggestion) {
    setLocationInput(suggestion.label);
    setSelectedLocation({
      query: suggestion.query,
      label: suggestion.label,
      latitude: suggestion.latitude ?? undefined,
      longitude: suggestion.longitude ?? undefined,
    });
    setIsSuggestionListOpen(false);
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
        <div className="location-input-row">
          <input
            id="location"
            name="location"
            placeholder="Try: Red River Gorge, KY"
            value={locationInput}
            autoComplete="off"
            onChange={(event) => {
              setLocationInput(event.target.value);
              setIsSuggestionListOpen(true);
            }}
            onFocus={() => setIsSuggestionListOpen(true)}
          />
          <button type="submit">Score climb</button>
        </div>
        {isSuggestionListOpen && locationInput.trim().length >= 2 && (
          <div className="suggestion-panel">
            {suggestionStatus === "loading" && (
              <p className="suggestion-helper">Searching places...</p>
            )}
            {suggestionStatus === "error" && (
              <p className="suggestion-helper">
                Suggestions are unavailable. You can still submit this location.
              </p>
            )}
            {suggestionStatus === "ready" && suggestions.length === 0 && (
              <p className="suggestion-helper">
                No suggestions found. Press Enter to score this location.
              </p>
            )}
            {suggestions.map((suggestion) => (
              <button
                className="suggestion-option"
                key={suggestion.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSuggestionSelect(suggestion)}
              >
                <span>{suggestion.label}</span>
                <small>{suggestion.detail}</small>
              </button>
            ))}
          </div>
        )}
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
