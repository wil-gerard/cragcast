import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions } from "@headlessui/react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { searchClimbLocations } from "../lib/xweather";
import type { ClimbLocation, ClimbLocationSuggestion } from "../types/weather";

type LocationSearchProps = {
  value: string;
  onValueChange: (value: string) => void;
  onSelectLocation: (location: ClimbLocation) => void;
};

export function LocationSearch({
  value,
  onValueChange,
  onSelectLocation,
}: LocationSearchProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const programmaticInputValue = useRef<string | null>(null);
  const [suggestions, setSuggestions] = useState<ClimbLocationSuggestion[]>([]);
  const [suggestionStatus, setSuggestionStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [suppressSuggestions, setSuppressSuggestions] = useState(false);

  useEffect(() => {
    const trimmedLocation = value.trim();

    if (suppressSuggestions || trimmedLocation.length < 2) {
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
  }, [suppressSuggestions, value]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitFreeTextLocation(value);
  }

  function handleSuggestionChange(suggestion: ClimbLocationSuggestion | null) {
    if (!suggestion) {
      return;
    }

    programmaticInputValue.current = suggestion.label;
    onValueChange(suggestion.label);
    onSelectLocation({
      query: suggestion.query,
      label: suggestion.label,
      latitude: suggestion.latitude ?? undefined,
      longitude: suggestion.longitude ?? undefined,
    });
    closeSuggestions();
  }

  function submitFreeTextLocation(inputValue: string) {
    const trimmedLocation = inputValue.trim();

    if (!trimmedLocation) {
      return;
    }

    onSelectLocation({
      query: trimmedLocation,
      label: trimmedLocation,
    });
    closeSuggestions();
  }

  function closeSuggestions() {
    setSuppressSuggestions(true);
    setSuggestions([]);
    setSuggestionStatus("idle");
    inputRef.current?.blur();
  }

  const showPanel = !suppressSuggestions && value.trim().length >= 2;

  return (
    <form className="location-form" onSubmit={handleSubmit}>
      <label htmlFor="location">Climb location</label>
      <Combobox value={null} onChange={handleSuggestionChange}>
        <div className="location-combobox">
          <div className="location-input-row">
            <ComboboxInput
              ref={inputRef}
              id="location"
              name="location"
              aria-label="Climb location"
              autoComplete="off"
              displayValue={() => value}
              placeholder="Try: Red River Gorge, KY"
              onChange={(event) => {
                const nextValue = event.target.value;

                onValueChange(nextValue);

                if (nextValue === programmaticInputValue.current) {
                  programmaticInputValue.current = null;
                  setSuppressSuggestions(true);
                  return;
                }

                programmaticInputValue.current = null;
                setSuppressSuggestions(false);
              }}
            />
            <button type="submit" onMouseDown={closeSuggestions}>
              Score climb
            </button>
          </div>
          {showPanel && (
            <ComboboxOptions className="suggestion-panel">
              {suggestionStatus === "loading" && (
                <div className="suggestion-helper">Searching places...</div>
              )}
              {suggestionStatus === "error" && (
                <div className="suggestion-helper">
                  Suggestions are unavailable. You can still submit this
                  location.
                </div>
              )}
              {suggestionStatus === "ready" && suggestions.length === 0 && (
                <div className="suggestion-helper">
                  No suggestions found. Press Enter to score this location.
                </div>
              )}
              {suggestions.map((suggestion) => (
                <ComboboxOption
                  className="suggestion-option"
                  key={suggestion.id}
                  value={suggestion}
                >
                  <span>{suggestion.label}</span>
                  <small>{suggestion.detail}</small>
                </ComboboxOption>
              ))}
            </ComboboxOptions>
          )}
        </div>
      </Combobox>
    </form>
  );
}
