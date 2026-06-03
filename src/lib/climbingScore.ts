import type { ClimbingConditionScore, ClimbWeather } from "../types/weather";

const RAIN_THRESHOLD = 30;

export function getClimbingConditionScore(
  input: ClimbWeather,
): ClimbingConditionScore {
  const reasons: string[] = [];
  const activeSevereAlert = input.alerts.some(
    (alert) =>
      alert.active &&
      (alert.severity === "severe" || alert.severity === "extreme"),
  );
  const rainExpected = input.forecastNextHours.some(
    (period) => (period.precipChance ?? 0) >= RAIN_THRESHOLD,
  );
  const recentRain =
    input.recentPrecip.trace || (input.recentPrecip.inches ?? 0) > 0;
  const highWind = (input.current.windMph ?? 0) > 25;
  const uncomfortableTemp =
    input.current.tempF !== null &&
    (input.current.tempF < 35 || input.current.tempF > 90);

  if (activeSevereAlert) {
    reasons.push("An active severe or extreme weather alert affects the area.");
  }

  if (input.threats.lightningOrThunderstormRisk) {
    reasons.push(
      "Lightning or thunderstorm risk is present in the current threat or forecast data.",
    );
  }

  if (rainExpected) {
    reasons.push(
      "Rain is expected in the next 6 hours. Wet rock dramatically reduces friction and makes climbing unsafe.",
    );
  }

  if (recentRain) {
    reasons.push(
      "Recent precipitation may leave rock damp even if current conditions look fine.",
    );
  }

  if (highWind) {
    reasons.push(
      `Wind is around ${Math.round(input.current.windMph ?? 0)} mph, above the 25 mph caution threshold.`,
    );
  }

  if (uncomfortableTemp) {
    reasons.push(
      `The current temperature is ${Math.round(input.current.tempF ?? 0)}F, outside the 35F to 90F comfort range.`,
    );
  }

  if (activeSevereAlert || input.threats.lightningOrThunderstormRisk || rainExpected) {
    return {
      status: "No Go",
      headline:
        "No Go: Rain, severe weather, or lightning risk makes this a poor time to climb.",
      reasons: limitReasons(reasons),
    };
  }

  if (recentRain || highWind || uncomfortableTemp) {
    return {
      status: "Caution",
      headline:
        "Caution: Some weather factors are outside the preferred range for climbing.",
      reasons: limitReasons(reasons),
    };
  }

  return {
    status: "Good",
    headline:
      "Good: Core weather factors look reasonable for a local conditions check.",
    reasons: [
      "No severe active alerts are included in the current weather response.",
      "No lightning or thunderstorm risk is flagged for the next few hours.",
      "Temperature, wind, and precipitation are within the starter app thresholds.",
    ],
  };
}

function limitReasons(reasons: string[]) {
  return reasons.slice(0, 5);
}
