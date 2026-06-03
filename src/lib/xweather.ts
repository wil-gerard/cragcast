import type {
  AlertSeverity,
  ClimbLocation,
  ClimbLocationSuggestion,
  ClimbWeather,
  ForecastPeriod,
  WeatherAlert,
} from "../types/weather";

type XweatherEnvelope<T> = {
  success?: boolean;
  error?: {
    code?: string;
    description?: string;
  };
  response?: T;
};

type PhrasesEnvelope = {
  response?: string;
  detail?: string;
};

type ObservationResponse = {
  ob?: {
    dateTimeISO?: string;
    tempF?: number;
    windMPH?: number;
    weather?: string;
  };
};

type ForecastResponse = Array<{
  periods?: Array<{
    dateTimeISO?: string;
    pop?: number;
    weather?: string;
  }>;
}>;

type ObservationSummaryResponse = Array<{
  periods?: Array<{
    summary?: {
      precip?: {
        totalIN?: number | null;
        trace?: boolean | null;
      } | null;
    };
  }>;
}>;

type AlertsResponse = Array<{
  active?: boolean;
  details?: {
    name?: string;
    type?: string;
  };
  timestamps?: {
    expiresISO?: string;
  };
}>;

type ThreatsResponse = Array<{
  periods?: Array<{
    storms?: {
      lightning?: {
        nearby?: number;
        approaching?: number;
        phrase?: string;
      } | null;
    } | null;
  }>;
}>;

type PlacesResponse = Array<{
  loc?: {
    lat?: number;
    long?: number;
  };
  place?: {
    name?: string;
    state?: string;
    stateFull?: string;
    country?: string;
    countryFull?: string;
  };
  profile?: {
    code?: string;
    tz?: string;
  };
}>;

const BASE_URL = "https://data.api.xweather.com";
const PHRASES_BASE_URL = "https://phrases.api.xweather.com";
const NEXT_HOURS = 6;
const SUGGESTION_LIMIT = 5;

export async function searchClimbLocations(
  query: string,
): Promise<ClimbLocationSuggestion[]> {
  const trimmedQuery = query.trim();
  const clientId = import.meta.env.VITE_XWEATHER_CLIENT_ID as string | undefined;
  const clientSecret = import.meta.env.VITE_XWEATHER_CLIENT_SECRET as
    | string
    | undefined;
  const useMockWeather = import.meta.env.VITE_USE_MOCK_WEATHER === "true";

  if (trimmedQuery.length < 2) {
    return [];
  }

  if (useMockWeather || !clientId || !clientSecret) {
    return getMockLocationSuggestions(trimmedQuery);
  }

  const data = await fetchOptionalEndpoint<PlacesResponse>(
    "/places/search",
    { clientId, clientSecret },
    {
      query: `name:^${trimmedQuery}`,
      limit: String(SUGGESTION_LIMIT),
    },
  );

  return normalizePlaces(data.response, trimmedQuery);
}

export async function fetchClimbWeather(
  location: ClimbLocation,
): Promise<ClimbWeather> {
  const clientId = import.meta.env.VITE_XWEATHER_CLIENT_ID as string | undefined;
  const clientSecret = import.meta.env.VITE_XWEATHER_CLIENT_SECRET as
    | string
    | undefined;
  const useMockWeather = import.meta.env.VITE_USE_MOCK_WEATHER === "true";

  if (useMockWeather || !clientId || !clientSecret) {
    return getMockClimbWeather(location, true);
  }

  const auth = { clientId, clientSecret };
  const encodedLocation = encodeURIComponent(location.query);

  const [observation, forecast, summary, alerts, threats] = await Promise.all([
    fetchEndpoint<ObservationResponse>(`/observations/${encodedLocation}`, auth),
    fetchEndpoint<ForecastResponse>(`/forecasts/${encodedLocation}`, auth, {
      filter: "1hr",
      limit: String(NEXT_HOURS),
    }),
    fetchOptionalEndpoint<ObservationSummaryResponse>(
      `/observations/summary/${encodedLocation}`,
      auth,
      {
        from: "-24hours",
        to: "now",
        limit: "1",
      },
    ),
    fetchOptionalEndpoint<AlertsResponse>(`/alerts/${encodedLocation}`, auth, {
      limit: "10",
    }),
    fetchEndpoint<ThreatsResponse>(`/threats/${encodedLocation}`, auth).catch(() => {
      return { success: false, response: undefined } satisfies XweatherEnvelope<ThreatsResponse>;
    }),
  ]);

  const phraseSummary = await fetchOptionalPhrasesSummary(encodedLocation, auth);

  const forecastNextHours = normalizeForecast(forecast.response);
  const normalizedThreats = normalizeThreats(threats.response, forecastNextHours);

  return {
    location,
    observedAtISO:
      observation.response?.ob?.dateTimeISO ?? new Date().toISOString(),
    current: {
      tempF: observation.response?.ob?.tempF ?? null,
      windMph: observation.response?.ob?.windMPH ?? null,
      weather: observation.response?.ob?.weather ?? null,
    },
    forecastNextHours,
    recentPrecip: normalizeRecentPrecip(summary.response),
    alerts: normalizeAlerts(alerts.response),
    threats: normalizedThreats,
    phraseSummary,
    meta: {
      source: "live",
      usedMockFallback: false,
    },
  };
}

function buildUrl(
  path: string,
  auth: { clientId: string; clientSecret: string },
  params: Record<string, string> = {},
) {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("client_id", auth.clientId);
  url.searchParams.set("client_secret", auth.clientSecret);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url;
}

async function fetchEndpoint<T>(
  path: string,
  auth: { clientId: string; clientSecret: string },
  params?: Record<string, string>,
) {
  const response = await fetch(buildUrl(path, auth, params));
  const data = (await response.json()) as XweatherEnvelope<T>;

  if (!response.ok || data.success === false) {
    throw new Error(
      data.error?.description ?? `Xweather request failed for ${path}`,
    );
  }

  return data;
}

async function fetchOptionalEndpoint<T>(
  path: string,
  auth: { clientId: string; clientSecret: string },
  params?: Record<string, string>,
) {
  try {
    return await fetchEndpoint<T>(path, auth, params);
  } catch {
    return { success: false, response: undefined } satisfies XweatherEnvelope<T>;
  }
}

async function fetchOptionalPhrasesSummary(
  encodedLocation: string,
  auth: { clientId: string; clientSecret: string },
) {
  try {
    const url = new URL(`${PHRASES_BASE_URL}/conditions/${encodedLocation}`);
    url.searchParams.set("client_id", auth.clientId);
    url.searchParams.set("client_secret", auth.clientSecret);
    url.searchParams.set("stream", "false");
    url.searchParams.set("units", "imperial");
    url.searchParams.set("language", "en");
    url.searchParams.set("personality", "default");
    url.searchParams.set("filter", "1hr");
    url.searchParams.set("limit", String(NEXT_HOURS));

    const response = await fetch(url);
    const data = (await response.json()) as PhrasesEnvelope;

    if (!response.ok || !data.response) {
      return {
        text: null,
        source: "unavailable" as const,
      };
    }

    return {
      text: data.response,
      source: "phrases" as const,
    };
  } catch {
    return {
      text: null,
      source: "unavailable" as const,
    };
  }
}

function normalizeForecast(response?: ForecastResponse): ForecastPeriod[] {
  const periods = response?.[0]?.periods ?? [];

  return periods.slice(0, NEXT_HOURS).map((period) => {
    const weather = period.weather ?? null;
    return {
      timeISO: period.dateTimeISO ?? new Date().toISOString(),
      precipChance: period.pop ?? null,
      weather,
      hasThunderstormRisk: hasStormLanguage(weather),
    };
  });
}

function normalizeRecentPrecip(response?: ObservationSummaryResponse) {
  const precip = response?.[0]?.periods?.[0]?.summary?.precip;

  if (!precip) {
    return {
      inches: null,
      trace: false,
      source: "unavailable" as const,
    };
  }

  return {
    inches: precip.totalIN ?? null,
    trace: Boolean(precip.trace),
    source: "observations-summary" as const,
  };
}

function normalizeAlerts(response?: AlertsResponse): WeatherAlert[] {
  return (response ?? []).map((alert) => ({
    title: alert.details?.name ?? alert.details?.type ?? "Active weather alert",
    severity: inferSeverity(alert.details?.type ?? alert.details?.name),
    active: alert.active ?? isFuture(alert.timestamps?.expiresISO),
  }));
}

function normalizeThreats(
  response: ThreatsResponse | undefined,
  forecastNextHours: ForecastPeriod[],
) {
  const periods = response?.flatMap((item) => item.periods ?? []) ?? [];
  const lightningPeriod = periods
    .map((p) => p.storms?.lightning)
    .find((l) => l && ((l.nearby ?? 0) > 0 || (l.approaching ?? 0) > 0));
  const lightningPhrase = lightningPeriod?.phrase ?? null;
  const lightningFromThreats = Boolean(lightningPeriod);
  const lightningFromForecast = forecastNextHours.some((p) => p.hasThunderstormRisk);

  if (response !== undefined && lightningFromThreats) {
    return {
      lightningOrThunderstormRisk: true,
      summary: lightningPhrase ?? "Lightning activity detected near this location.",
      source: "threats" as const,
    };
  }

  const endpointResponded = response !== undefined;

  return {
    lightningOrThunderstormRisk: lightningFromForecast,
    summary: lightningFromForecast
      ? "Thunderstorm language appears in the hourly forecast."
      : null,
    source: lightningFromForecast
      ? ("forecast" as const)
      : endpointResponded
        ? ("threats" as const)
        : ("unavailable" as const),
  };
}

function inferSeverity(value?: string): AlertSeverity {
  const normalized = value?.toLowerCase() ?? "";

  if (normalized.includes("extreme")) return "extreme";
  if (
    normalized.includes("severe") ||
    normalized.includes("warning") ||
    normalized.endsWith(".w")
  ) {
    return "severe";
  }
  if (normalized.includes("moderate") || normalized.includes("watch")) {
    return "moderate";
  }
  if (normalized.includes("minor") || normalized.includes("advisory")) {
    return "minor";
  }

  return "unknown";
}

function hasStormLanguage(value?: string | null) {
  const normalized = value?.toLowerCase() ?? "";
  return (
    normalized.includes("lightning") ||
    normalized.includes("thunder") ||
    normalized.includes("t-storm") ||
    normalized.includes("storm")
  );
}

function isFuture(iso?: string) {
  if (!iso) return false;
  return new Date(iso).getTime() > Date.now();
}

export function getMockClimbWeather(
  location: ClimbLocation,
  usedMockFallback = false,
): ClimbWeather {
  const now = new Date();
  return {
    location,
    observedAtISO: now.toISOString(),
    current: {
      tempF: 67,
      windMph: 11,
      weather: "Partly Cloudy",
    },
    forecastNextHours: Array.from({ length: NEXT_HOURS }, (_, index) => ({
      timeISO: new Date(now.getTime() + (index + 1) * 60 * 60 * 1000).toISOString(),
      precipChance: index >= 3 ? 35 : 12,
      weather: index >= 3 ? "Chance of Rain" : "Partly Cloudy",
      hasThunderstormRisk: false,
    })),
    recentPrecip: {
      inches: 0.04,
      trace: false,
      source: "mock",
    },
    alerts: [],
    threats: {
      lightningOrThunderstormRisk: false,
      summary: "No lightning or thunderstorm threat in mock data.",
      source: "mock",
    },
    phraseSummary: {
      text:
        "Mock summary: Conditions look comfortable overall, but a later chance of rain and recent moisture could leave rock damp. Treat this as weather context, not a safety clearance.",
      source: "mock",
    },
    meta: {
      source: "mock",
      usedMockFallback,
    },
  };
}

function normalizePlaces(
  response: PlacesResponse | undefined,
  fallbackQuery: string,
): ClimbLocationSuggestion[] {
  return (response ?? [])
    .map((place, index) => {
      const name = place.place?.name ?? fallbackQuery;
      const region = place.place?.state || place.place?.stateFull;
      const country = place.place?.country || place.place?.countryFull;
      const label = [name, region, country].filter(Boolean).join(", ");
      const detail = [place.place?.stateFull, place.place?.countryFull, place.profile?.tz]
        .filter(Boolean)
        .join(" - ");

      return {
        id: `${place.profile?.code ?? label}-${index}`,
        query: label,
        label,
        detail: detail || label,
        latitude: place.loc?.lat ?? null,
        longitude: place.loc?.long ?? null,
      };
    })
    .filter((suggestion) => suggestion.label.length > 0);
}

function getMockLocationSuggestions(query: string): ClimbLocationSuggestion[] {
  const examples = [
    {
      label: "Taylors Falls, MN, US",
      detail: "Minnesota - United States - mock result",
      latitude: 45.3992,
      longitude: -92.6517,
    },
    {
      label: "Red River Gorge, KY, US",
      detail: "Kentucky - United States - mock result",
      latitude: 37.8233,
      longitude: -83.6287,
    },
    {
      label: "Boulder, CO, US",
      detail: "Colorado - United States - mock result",
      latitude: 40.015,
      longitude: -105.2705,
    },
    {
      label: "Joshua Tree, CA, US",
      detail: "California - United States - mock result",
      latitude: 34.1347,
      longitude: -116.3131,
    },
  ];
  const normalizedQuery = query.toLowerCase();

  return examples
    .filter((example) => example.label.toLowerCase().includes(normalizedQuery))
    .slice(0, SUGGESTION_LIMIT)
    .map((example, index) => ({
      id: `mock-${index}-${example.label}`,
      query: example.label,
      ...example,
    }));
}
