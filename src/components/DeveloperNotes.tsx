export function DeveloperNotes() {
  return (
    <section className="panel developer-notes">
      <div className="section-heading">
        <p className="eyebrow">Developer notes</p>
        <h2>How this starter works</h2>
      </div>
      <div className="notes-grid">
        <div>
          <h3>Xweather data used</h3>
          <p>
            The app normalizes current observations, hourly forecast periods,
            active alerts, recent precipitation summaries, and optional threats
            and Phrases API data for the submitted location into one UI-friendly
            weather object.
          </p>
        </div>
        <div>
          <h3>Scoring function</h3>
          <p>
            <code>getClimbingConditionScore</code> is a pure TypeScript function.
            It checks severe alerts, lightning risk, rain, recent precipitation,
            wind, and temperature with deliberately readable thresholds. The
            Phrases summary is context only, not an input to the score.
          </p>
        </div>
        <div>
          <h3>Adaptation path</h3>
          <p>
            Use a different location query, tune thresholds, and relabel the
            factor cards to support a crag, outdoor event, park operation, field
            service workflow, or recreation app.
          </p>
        </div>
      </div>
    </section>
  );
}
