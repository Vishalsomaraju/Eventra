import React, { useState, useCallback } from 'react';
import { Navigation } from './components/Navigation';
import { PlannerForm } from './components/PlannerForm';
import { ResultsArea } from './components/ResultsArea';
import { HowItWorks } from './components/HowItWorks';
import { PlanOutput } from './types';

export default function App(): React.JSX.Element {
  const [plan, setPlan] = useState<PlanOutput | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStartLoading = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
  }, []);

  const handlePlanGenerated = useCallback((generatedPlan: PlanOutput) => {
    setPlan(generatedPlan);
    setIsLoading(false);
    setErrorMessage(null);

    // Smoothly scroll down to results after generation completes
    const resultsElement = document.getElementById('results-heading');
    if (resultsElement) {
      resultsElement.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handlePlanError = useCallback((error: string) => {
    setErrorMessage(error);
    setIsLoading(false);

    // Smoothly scroll down to error notice
    const resultsElement = document.getElementById('results-heading');
    if (resultsElement) {
      resultsElement.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleDismissError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  return (
    <div className="app-container">
      <Navigation />

      <main id="main-content" className="main-content">
        {/* Planner — Primary Section */}
        <section id="planner" className="planner-section" aria-labelledby="planner-heading">
          <div className="section-header">
            <h1 id="planner-heading" className="brand-title">
              Eventra
            </h1>
            <p className="brand-tagline">
              Lightweight AI-powered Celebration &amp; Event Planner for weddings, birthdays, and community events.
              Organize personalized ideas, practical INR budgets, actionable timelines, and vendor checklists.
            </p>
          </div>

          <div className="planner-card">
            <h2 className="planner-card-title">Event Planning Details</h2>
            <p className="planner-card-subtitle">
              Enter your event specifications below to generate a tailored celebration plan.
            </p>
            <PlannerForm
              onPlanGenerated={handlePlanGenerated}
              onError={handlePlanError}
              isLoading={isLoading}
              onStartLoading={handleStartLoading}
            />
          </div>

          {/* Results Area (always part of Planner solution) */}
          <ResultsArea
            plan={plan}
            isLoading={isLoading}
            errorMessage={errorMessage}
            onDismissError={handleDismissError}
          />
        </section>

        {/* How It Works Section */}
        <HowItWorks />

      </main>

      <footer className="site-footer">
        <div className="footer-container">
          <p className="footer-copy">
            &copy; {new Date().getFullYear()} Eventra — Celebration &amp; Event Planner
          </p>
          <ul className="footer-links">
            <li>
              <a href="#planner">Planner</a>
            </li>
            <li>
              <a href="#how-it-works">How It Works</a>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  );
}
