# CragCast

CragCast is a one page React, TypeScript, and Vite starter project that answers a practical question: are the weather conditions reasonable for a climb at a location right now or later today?

It works as a code recipe for building weather aware decision support with Xweather APIs. The app keeps the scope small so developers can read the code, run it locally, and adapt the pattern to outdoor recreation, operations, field service, or event planning.

This is not a climbing safety authority, route guide, access source, or conditions guarantee. Climbers still need to check local closures, park rules, and real rock conditions before climbing.

## What this demonstrates

- Turning weather API data into a useful decision support widget developers can run and modify.
- Building a real world weather intelligence demo around a specific user decision.
- Normalizing third party API responses behind a small TypeScript abstraction.
- Keeping business logic readable with a pure scoring function.
- Designing a polished one page starter without auth, a backend, a database, route data, user reports, or complex maps.
- Accepting a location query with predictive search and returning an explainable climb score.
- Combining deterministic scoring with an optional AI generated weather summary from Xweather Phrases.
- Structuring the project like a tutorial so another developer can reuse the API layer, scoring model, and UI pattern.

## Why weather data matters

Outdoor recreation apps often need more than a forecast card. A climber, park visitor, event organizer, or field service team may need to understand whether conditions are reasonable for a specific activity at a specific place. CragCast lets a user search for a location, then scores the weather using temperature, wind, precipitation chance, recent precipitation, active alerts, and thunderstorm or lightning risk.

## How CragCast uses Xweather

The Xweather integration lives in `src/lib/xweather.ts`. The UI consumes a normalized `ClimbWeather` object instead of raw API responses.

Xweather data sources:

- Places search for predictive location suggestions.
- Current observations for temperature, wind, and current weather.
- Hourly forecast for precipitation chance and near term weather language.
- Active alerts for severe weather concerns.
- Observation summary for recent precipitation when available.
- Threats data for lightning or thunderstorm risk when available.
- Phrases API conditions summary for plain English weather context when available.

Some Xweather datasets may require specific account access. Optional endpoints are handled gracefully so the app can still render with unavailable factors or mock data.

The location search uses Headless UI's Combobox component for accessible autocomplete behavior while keeping the Xweather API and scoring logic in TypeScript modules owned by this project.

The Phrases API summary is displayed as context only. It does not decide the climb score. The score remains deterministic and explainable in `src/lib/climbingScore.ts`.

## Walkthrough

1. The user searches for a climb location.
2. `searchClimbLocations()` calls Xweather Places search and normalizes suggestions.
3. Selecting or submitting a location calls `fetchClimbWeather()`.
4. The Xweather client gathers current conditions, hourly forecast, alerts, recent precipitation, optional threats, and optional Phrases context.
5. `getClimbingConditionScore()` evaluates the normalized data with clear thresholds.
6. The UI renders a status, plain English reasons, weather factor cards, and developer notes that explain how the recipe can be adapted.

## Scoring logic

The scoring function lives in `src/lib/climbingScore.ts`:

```ts
getClimbingConditionScore(input)
```

It returns:

```ts
{
  status: "Good" | "Caution" | "Maybe" | "No Go",
  headline: string,
  reasons: string[]
}
```

Starter rules:

- `No Go` if there is an active severe or extreme alert.
- `No Go` if lightning or thunderstorm risk is flagged.
- `Caution` if wind is over 25 mph.
- `Caution` if temperature is below 35F or above 90F.
- `Maybe` if rain is expected in the next 6 hours.
- `Maybe` if recent precipitation may leave rock damp.
- `Good` only when none of the risk rules fire.

The goal is explainable starter logic, not a definitive safety model.

## Run locally

Install dependencies:

```bash
pnpm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Add your Xweather credentials:

```bash
VITE_XWEATHER_CLIENT_ID=your_client_id
VITE_XWEATHER_CLIENT_SECRET=your_client_secret
VITE_USE_MOCK_WEATHER=false
```

Start the app:

```bash
pnpm dev
```

Build for production:

```bash
pnpm build
```

## Mock mode

If credentials are missing or `VITE_USE_MOCK_WEATHER=true`, the app renders realistic mock starter data. This keeps the demo usable even before live Xweather credentials are configured.

## Production credential note

This starter uses `VITE_XWEATHER_CLIENT_SECRET` in the browser so the local demo can stay one page and avoid a backend. That is acceptable for local exploration, but not for a production app.

For production, proxy Xweather requests through a backend or serverless function so secrets remain on the server. A production version should also cache responses, handle rate limits, and centralize API error handling.

The Phrases API can have higher usage cost than basic weather lookups and may require subscription access. Keep it optional or cache responses on the server in production.

## Adapting the starter

- Change the default example in `src/data/sampleLocation.ts`.
- Tune thresholds in `src/lib/climbingScore.ts` for the activity you care about.
- Update the factor cards in `src/components/WeatherFactorGrid.tsx` to emphasize different operational risks.
- Swap the safety framing for another use case, such as field service dispatch, parks operations, outdoor events, cycling, paddling, or trail work.
- Add Xweather MapsGL later if you want a compact radar, precipitation, wind, or storm preview around the selected location. Keep it optional unless the demo needs weather visualization, since MapsGL requires map setup and an active Maps subscription.

## Why this starter exists

Weather intelligence is most useful when it is connected to a decision. CragCast shows one way to turn Xweather APIs into a focused application flow: search for a place, gather relevant weather signals, normalize the data, apply transparent rules, and explain the result in plain language.

The same pattern can support many developer recipes: outdoor recreation planning, parks operations, event readiness, field service dispatch, construction scheduling, logistics, and other workflows where teams need more than raw forecast data.

## Project structure

```text
src/
  App.tsx
  main.tsx
  styles.css
  data/sampleLocation.ts
  lib/xweather.ts
  lib/climbingScore.ts
  components/ConditionCard.tsx
  components/LocationSearch.tsx
  components/WeatherSummary.tsx
  components/WeatherFactorGrid.tsx
  components/WhyThisRating.tsx
  components/DeveloperNotes.tsx
  types/weather.ts
```
