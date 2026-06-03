export function DeveloperNotes() {
  return (
    <section className="panel developer-notes">
      <div className="section-heading">
        <p className="eyebrow">About this score</p>
        <h2>How the climb score works</h2>
      </div>
      <div className="notes-grid">
        <div>
          <h3>Weather data</h3>
          <p>
            CragCast pulls current observations, hourly forecasts, active
            alerts, recent precipitation, and threat data from Xweather for
            the selected location.
          </p>
        </div>
        <div>
          <h3>Scoring</h3>
          <p>
            The score checks for severe alerts, lightning risk, incoming rain,
            recent precipitation, high wind, and temperature outside the
            comfortable climbing range. The narrative summary is context only
            and does not affect the score.
          </p>
        </div>
      </div>
    </section>
  );
}
