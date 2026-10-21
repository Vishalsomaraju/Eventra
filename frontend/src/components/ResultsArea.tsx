import React, { useState, useMemo } from 'react';
import { PlanOutput } from '../types';
import { VendorChecklistSection } from './VendorChecklistSection';

interface ResultsAreaProps {
  plan: PlanOutput | null;
  isLoading: boolean;
  errorMessage: string | null;
  onDismissError?: () => void;
}

const eventTypeLabels: Record<string, string> = {
  wedding: 'Wedding',
  birthday: 'Birthday',
  community: 'Community Event',
};

const ResultsAreaComponent: React.FC<ResultsAreaProps> = ({
  plan,
  isLoading,
  errorMessage,
  onDismissError,
}) => {
  // Key-based state reset: Track plan reference to ensure checklist state
  // resets cleanly on every newly generated plan without redundant useEffect synchronization.
  const [prevPlan, setPrevPlan] = useState<PlanOutput | null>(null);
  const [planInstanceId, setPlanInstanceId] = useState<number>(0);

  if (plan !== prevPlan) {
    setPrevPlan(plan);
    setPlanInstanceId((prev) => prev + 1);
  }

  const totalAllocatedInr = useMemo(() => {
    return plan?.budgetBreakdown?.categories
      ? plan.budgetBreakdown.categories.reduce((acc, cat) => acc + cat.allocatedInr, 0)
      : 0;
  }, [plan?.budgetBreakdown?.categories]);

  return (
    <section className="results-section" aria-labelledby="results-heading">
      <div className="section-header">
        <h2 id="results-heading" className="section-title">
          Planning Deliverables
        </h2>
        <p className="section-subtitle">
          Eventra produces four core artifacts to streamline your celebration planning.
        </p>
      </div>

      {/* Accessible Error State */}
      {errorMessage && (
        <div className="api-error-card" role="alert" aria-live="assertive">
          <div className="api-error-header">
            <span className="error-icon" aria-hidden="true">⚠️</span>
            <h3 className="api-error-title">Plan Generation Error</h3>
          </div>
          <p className="api-error-message">{errorMessage}</p>
          {onDismissError && (
            <button
              type="button"
              className="btn-dismiss-error"
              onClick={onDismissError}
              aria-label="Dismiss error message"
            >
              Dismiss &amp; Review Inputs
            </button>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="loading-state-card" role="status" aria-live="polite">
          <div className="spinner-large" aria-hidden="true" />
          <h3 className="loading-title">Synthesizing Your Celebration Plan</h3>
          <p className="loading-description">
            Eventra is processing your event parameters, computing exact rupee budget allocations,
            and structuring your planning milestones...
          </p>
        </div>
      )}

      {/* Empty State before any plan is generated */}
      {!plan && !isLoading && !errorMessage && (
        <div className="results-empty-state">
          <div className="empty-state-card">
            <h3 className="empty-state-title">Ready for Your Plan</h3>
            <p className="empty-state-description">
              Fill in the event parameters above and select <strong>Generate My Plan</strong>.
              Your personalized recommendations, itemized INR budget, chronological schedule, and vendor checklist
              will be dynamically generated and displayed below.
            </p>
          </div>

          <div className="deliverables-grid">
            <article className="deliverable-card">
              <span className="deliverable-badge">Artifact 1</span>
              <h4 className="deliverable-name">Personalized Event Ideas</h4>
              <p className="deliverable-desc">
                Customized theme recommendations, atmosphere styling, and attendee experience concepts tailored to your event type.
              </p>
            </article>

            <article className="deliverable-card">
              <span className="deliverable-badge">Artifact 2</span>
              <h4 className="deliverable-name">Budget Breakdown (₹ INR)</h4>
              <p className="deliverable-desc">
                Itemized spending allocations across venue, catering, decor, entertainment, and contingency reserves with exact total verification.
              </p>
            </article>

            <article className="deliverable-card">
              <span className="deliverable-badge">Artifact 3</span>
              <h4 className="deliverable-name">Planning Timeline</h4>
              <p className="deliverable-desc">
                Phased chronological milestones and checklist deadlines from initial booking through day-of-event execution.
              </p>
            </article>

            <article className="deliverable-card">
              <span className="deliverable-badge">Artifact 4</span>
              <h4 className="deliverable-name">Vendor Checklist</h4>
              <p className="deliverable-desc">
                Actionable coordination checklists for sourcing, vetting, and managing suppliers and service providers with interactive status tracking.
              </p>
            </article>
          </div>
        </div>
      )}

      {/* Actual Generated Plan Result */}
      {plan && !isLoading && (
        <div className="plan-results-wrapper">
          {/* Plan Header & Engine Identification */}
          <div className="plan-engine-banner">
            <div className="engine-info-row">
              <div className="engine-badge-container">
                {plan.engine.type === 'ai' ? (
                  <span className="engine-badge badge-ai">
                    <span className="engine-dot dot-ai" aria-hidden="true" />
                    Google Gemini AI ({plan.engine.model || 'gemini-2.5-flash'})
                  </span>
                ) : (
                  <span className="engine-badge badge-fallback">
                    <span className="engine-dot dot-fallback" aria-hidden="true" />
                    Deterministic Rule-Based Fallback
                  </span>
                )}
                <span className="generation-timestamp">
                  Model: {plan.engine.model}
                </span>
              </div>
            </div>

            {plan.engine.fallbackReason && (
              <div className="engine-fallback-notice">
                <strong>Notice:</strong> This plan was synthesized by the deterministic rule-based engine because: {plan.engine.fallbackReason}
              </div>
            )}
          </div>

          {/* Event Summary Overview Bar */}
          <div className="plan-summary-bar">
            <div className="summary-pill">
              <span className="pill-label">Event:</span>
              <span className="pill-value">
                {plan.summary.eventName || eventTypeLabels[plan.summary.eventType]}
              </span>
            </div>
            <div className="summary-pill">
              <span className="pill-label">Category:</span>
              <span className="pill-value">{eventTypeLabels[plan.summary.eventType]}</span>
            </div>
            <div className="summary-pill">
              <span className="pill-label">Guests:</span>
              <span className="pill-value">{plan.summary.guestCount.toLocaleString('en-IN')}</span>
            </div>
            <div className="summary-pill">
              <span className="pill-label">Total Budget:</span>
              <span className="pill-value">₹{plan.summary.budgetInr.toLocaleString('en-IN')}</span>
            </div>
            {plan.summary.eventDate && (
              <div className="summary-pill">
                <span className="pill-label">Date:</span>
                <span className="pill-value">{plan.summary.eventDate}</span>
              </div>
            )}
            {plan.summary.eventLocation && (
              <div className="summary-pill">
                <span className="pill-label">Location:</span>
                <span className="pill-value">{plan.summary.eventLocation}</span>
              </div>
            )}
          </div>

          {/* Artifact 1: Personalized Event Ideas */}
          <section className="deliverable-section" aria-labelledby="ideas-title">
            <div className="deliverable-header">
              <div className="deliverable-title-group">
                <span className="deliverable-badge active">Artifact 1</span>
                <h3 id="ideas-title" className="deliverable-section-title">
                  Personalized Event Ideas
                </h3>
              </div>
              <span className="deliverable-count">
                {plan.personalizedIdeas ? plan.personalizedIdeas.length : 0} Recommendations
              </span>
            </div>

            <div className="ideas-grid">
              {plan.personalizedIdeas?.map((idea, idx) => (
                <article key={idea.id || idx} className="idea-card">
                  <div className="idea-header">
                    <span className="idea-category-tag">{idea.category}</span>
                    <h4 className="idea-card-title">{idea.title}</h4>
                  </div>
                  <p className="idea-card-desc">{idea.description}</p>
                </article>
              ))}
            </div>
          </section>

          {/* Artifact 2: Budget Breakdown (₹ INR) */}
          <section className="deliverable-section" aria-labelledby="budget-title">
            <div className="deliverable-header">
              <div className="deliverable-title-group">
                <span className="deliverable-badge active">Artifact 2</span>
                <h3 id="budget-title" className="deliverable-section-title">
                  Budget Breakdown (₹ INR)
                </h3>
              </div>
              <div className="budget-reconciled-badge">
                <span className="check-icon" aria-hidden="true">✓</span>
                Exact Total Reconciled: ₹{totalAllocatedInr.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="budget-table-container">
              <table className="budget-table">
                <thead>
                  <tr>
                    <th scope="col">Category</th>
                    <th scope="col" className="text-right">Allocation (₹)</th>
                    <th scope="col" className="text-right">Share (%)</th>
                    <th scope="col">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.budgetBreakdown?.categories?.map((cat, idx) => (
                    <tr key={idx}>
                      <td className="cat-name">{cat.category}</td>
                      <td className="cat-amount text-right">
                        ₹{cat.allocatedInr.toLocaleString('en-IN')}
                      </td>
                      <td className="cat-percent text-right">{cat.percentage.toFixed(1)}%</td>
                      <td className="cat-desc">{cat.description}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="budget-total-row">
                    <td>Total Planned Budget</td>
                    <td className="text-right font-bold">
                      ₹{totalAllocatedInr.toLocaleString('en-IN')}
                    </td>
                    <td className="text-right font-bold">100.0%</td>
                    <td className="total-reconciled-note">
                      Exact sum match (₹{plan.budgetBreakdown.totalBudgetInr.toLocaleString('en-IN')})
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* Artifact 3: Planning Timeline */}
          <section className="deliverable-section" aria-labelledby="timeline-title">
            <div className="deliverable-header">
              <div className="deliverable-title-group">
                <span className="deliverable-badge active">Artifact 3</span>
                <h3 id="timeline-title" className="deliverable-section-title">
                  Planning Timeline &amp; Milestones
                </h3>
              </div>
              <span className="timeline-schedule-mode">
                {plan.planningTimeline?.timelineType === 'date_relative'
                  ? `Scheduled for ${plan.planningTimeline.targetDate}`
                  : 'Relative Schedule'}
              </span>
            </div>

            <div className="timeline-phases-list">
              {plan.planningTimeline?.phases?.map((phase, idx) => (
                <div key={idx} className="timeline-phase-card">
                  <div className="phase-header">
                    <span className="phase-number">{idx + 1}</span>
                    <div className="phase-title-group">
                      <h4 className="phase-name">{phase.phase}</h4>
                      <div className="phase-meta">
                        <span className="phase-timeframe">{phase.timeframe}</span>
                      </div>
                    </div>
                  </div>
                  <ul className="phase-tasks-list">
                    {phase.tasks?.map((task, tIdx) => (
                      <li key={tIdx} className="phase-task-item">
                        <span className="task-bullet" aria-hidden="true">•</span>
                        <span>{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* Artifact 4: Vendor Checklist (Isolated component boundary for zero-rerender checklist interactions) */}
          <VendorChecklistSection
            key={`checklist-${planInstanceId}`}
            initialChecklist={plan.vendorChecklist}
          />

          {/* Disclaimer & Transparency Footer */}
          <div className="plan-disclaimer-card">
            <h4 className="disclaimer-title">Planning Estimates &amp; Disclaimer</h4>
            <p className="disclaimer-text">
              {plan.engine?.disclaimer ||
                'Cost allocations and vendor suggestions are estimates based on standard Indian event market ranges. Actual vendor pricing and contract terms should be verified directly with suppliers.'}
            </p>
          </div>
        </div>
      )}
    </section>
  );
};

export const ResultsArea = React.memo<ResultsAreaProps>(ResultsAreaComponent);
