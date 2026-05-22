import type { ClimbingConditionScore } from "../types/weather";

type WhyThisRatingProps = {
  score: ClimbingConditionScore;
};

export function WhyThisRating({ score }: WhyThisRatingProps) {
  return (
    <section className="panel">
      <div className="section-heading">
        <p className="eyebrow">Scoring</p>
        <h2>Why this rating?</h2>
      </div>
      <ul className="reason-list">
        {score.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </section>
  );
}
