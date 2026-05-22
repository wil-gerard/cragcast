export type ConditionStatus = "Good" | "Caution" | "Maybe" | "No Go";

export type AlertSeverity =
  | "minor"
  | "moderate"
  | "severe"
  | "extreme"
  | "unknown";

export type ClimbLocation = {
  query: string;
  label: string;
  latitude?: number;
  longitude?: number;
};

export type ClimbLocationSuggestion = {
  id: string;
  query: string;
  label: string;
  detail: string;
  latitude: number | null;
  longitude: number | null;
};

export type ForecastPeriod = {
  timeISO: string;
  precipChance: number | null;
  weather: string | null;
  hasThunderstormRisk: boolean;
};

export type WeatherAlert = {
  title: string;
  severity: AlertSeverity;
  active: boolean;
};

export type ClimbWeather = {
  location: ClimbLocation;
  observedAtISO: string;
  current: {
    tempF: number | null;
    windMph: number | null;
    weather: string | null;
  };
  forecastNextHours: ForecastPeriod[];
  recentPrecip: {
    inches: number | null;
    trace: boolean;
    source: "observations-summary" | "mock" | "unavailable";
  };
  alerts: WeatherAlert[];
  threats: {
    lightningOrThunderstormRisk: boolean;
    summary: string | null;
    source: "threats" | "forecast" | "mock" | "unavailable";
  };
  meta: {
    source: "live" | "mock";
    usedMockFallback: boolean;
  };
};

export type ClimbingConditionScore = {
  status: ConditionStatus;
  headline: string;
  reasons: string[];
};
