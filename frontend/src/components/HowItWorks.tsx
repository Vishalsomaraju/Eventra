import React from 'react';

export const HowItWorks: React.FC = () => {
  return (
    <section id="how-it-works" className="content-section" aria-labelledby="how-it-works-heading">
      <div className="section-header">
        <h2 id="how-it-works-heading" className="section-title">
          How It Works
        </h2>
        <p className="section-subtitle">
          Three straightforward steps to take your event from concept to reality.
        </p>
      </div>

      <div className="steps-grid">
        <article className="step-card">
          <div className="step-number" aria-hidden="true">
            1
          </div>
          <h3 className="step-title">Enter Event Details &amp; Budget</h3>
          <p className="step-text">
            Provide your event category, expected guest headcount, total budget in INR, and any specific preferences or constraints.
          </p>
        </article>

        <article className="step-card">
          <div className="step-number" aria-hidden="true">
            2
          </div>
          <h3 className="step-title">Generate a Personalized Plan</h3>
          <p className="step-text">
            The planning assistant analyzes your inputs to structure tailored theme ideas, spending allocations, and milestone deadlines.
          </p>
        </article>

        <article className="step-card">
          <div className="step-number" aria-hidden="true">
            3
          </div>
          <h3 className="step-title">Organize with Budget, Timeline &amp; Checklist</h3>
          <p className="step-text">
            Use the practical budget breakdown, chronological timeline, and vendor checklist to systematically coordinate every celebration detail.
          </p>
        </article>
      </div>
    </section>
  );
};
