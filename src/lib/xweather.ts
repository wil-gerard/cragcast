import type {
  AlertSeverity,
  ClimbLocation,
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
    threat?: {
      phrase?: string;
      type?: string;
      risk?: string;
    };
    phrase?: string;
    weather?: string;
  }>;
}>;

const BASE_URL = "https://data.api.xweather.com";
const NEXT_HOURS = 6;

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
    // TODO: Some Xweather threat/lightning data may require subscription access.
    // The UI consumes a normalized optional shape so a server-side proxy or
    // account-specific endpoint can be swapped in without touching components.
    fetchOptionalEndpoint<ThreatsResponse>(`/threats/${encodedLocation}`, auth),
  ]);

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
  const threatPhrase = response
    ?.flatMap((item) => item.periods ?? [])
    .map((period) => period.threat?.phrase ?? period.phrase ?? period.weather)
    .find(Boolean);
  const lightningFromThreats = hasStormLanguage(threatPhrase);
  const lightningFromForecast = forecastNextHours.some(
    (period) => period.hasThunderstormRisk,
  );

  if (response && threatPhrase) {
    return {
      lightningOrThunderstormRisk: lightningFromThreats || lightningFromForecast,
      summary: threatPhrase,
      source: "threats" as const,
    };
  }

  return {
    lightningOrThunderstormRisk: lightningFromForecast,
    summary: lightningFromForecast
      ? "Thunderstorm language appears in the hourly forecast."
      : null,
    source: lightningFromForecast ? ("forecast" as const) : ("unavailable" as const),
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
    meta: {
      source: "mock",
      usedMockFallback,
    },
  };
}
