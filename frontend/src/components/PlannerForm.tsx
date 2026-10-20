import React, { useState, useRef } from 'react';
import { PlannerFormData, FormErrors, PlanOutput, PlanApiResponse } from '../types';

interface PlannerFormProps {
  onPlanGenerated: (plan: PlanOutput) => void;
  onError: (errorMessage: string) => void;
  isLoading: boolean;
  onStartLoading: () => void;
}

const initialFormData: PlannerFormData = {
  eventType: '',
  eventName: '',
  eventDate: '',
  eventLocation: '',
  guestCount: '',
  totalBudget: '',
  eventPreferences: '',
};

export const PlannerForm: React.FC<PlannerFormProps> = ({
  onPlanGenerated,
  onError,
  isLoading,
  onStartLoading,
}) => {
  const [formData, setFormData] = useState<PlannerFormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});

  const eventTypeRef = useRef<HTMLSelectElement>(null);
  const guestCountRef = useRef<HTMLInputElement>(null);
  const totalBudgetRef = useRef<HTMLInputElement>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear field-specific error upon editing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate Event Type
    if (!formData.eventType) {
      newErrors.eventType = 'Please select an event type.';
    }

    // Validate Guest Count
    const parsedGuests = Number(formData.guestCount);
    if (!formData.guestCount.trim()) {
      newErrors.guestCount = 'Please enter the expected number of guests.';
    } else if (isNaN(parsedGuests) || !Number.isInteger(parsedGuests) || parsedGuests <= 0) {
      newErrors.guestCount = 'Guest count must be a positive whole number (minimum 1).';
    } else if (parsedGuests > 100000) {
      newErrors.guestCount = 'Guest count cannot exceed 1,00,000 attendees.';
    }

    // Validate Total Budget in INR
    const parsedBudget = Number(formData.totalBudget);
    if (!formData.totalBudget.trim()) {
      newErrors.totalBudget = 'Please enter your total budget in INR.';
    } else if (isNaN(parsedBudget) || parsedBudget <= 0) {
      newErrors.totalBudget = 'Total budget must be a positive number greater than 0.';
    } else if (parsedBudget > 100000000) {
      newErrors.totalBudget = 'Total budget cannot exceed ₹10,00,00,000 (10 Crore INR).';
    }

    setErrors(newErrors);

    // Focus the first invalid input for keyboard accessibility
    if (newErrors.eventType && eventTypeRef.current) {
      eventTypeRef.current.focus();
    } else if (newErrors.guestCount && guestCountRef.current) {
      guestCountRef.current.focus();
    } else if (newErrors.totalBudget && totalBudgetRef.current) {
      totalBudgetRef.current.focus();
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) {
      return; // Prevent duplicate submissions while active
    }

    if (!validate()) {
      return;
    }

    onStartLoading();

    const payload = {
      eventType: formData.eventType,
      eventName: formData.eventName.trim() || undefined,
      eventDate: formData.eventDate || undefined,
      eventLocation: formData.eventLocation.trim() || undefined,
      guestCount: parseInt(formData.guestCount, 10),
      budgetInr: parseFloat(formData.totalBudget),
      preferences: formData.eventPreferences.trim() || undefined,
    };

    try {
      const response = await fetch('/api/plans/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json: PlanApiResponse = await response.json();

      if (response.ok && json.success) {
        onPlanGenerated(json.data);
      } else {
        const errorMsg =
          !json.success && json.error
            ? json.error
            : `Plan generation failed (Status ${response.status}). Please try again.`;
        onError(errorMsg);
      }
    } catch {
      onError(
        'Unable to communicate with the planning server. Please verify your connection and ensure the backend is running.'
      );
    }
  };

  return (
    <form className="planner-form" onSubmit={handleSubmit} noValidate>
      <div className="form-grid">
        {/* Event Type (Required) */}
        <div className="form-group">
          <label htmlFor="eventType" className="form-label">
            Event Type <span className="required-indicator" aria-hidden="true">*</span>
            <span className="field-requirement">(required)</span>
          </label>
          <select
            id="eventType"
            name="eventType"
            ref={eventTypeRef}
            value={formData.eventType}
            onChange={handleChange}
            disabled={isLoading}
            className={`form-input ${errors.eventType ? 'input-error' : ''}`}
            aria-required="true"
            aria-invalid={Boolean(errors.eventType)}
            aria-describedby={errors.eventType ? 'eventType-error eventType-hint' : 'eventType-hint'}
          >
            <option value="">Select an event type...</option>
            <option value="wedding">Wedding</option>
            <option value="birthday">Birthday</option>
            <option value="community">Community Event</option>
          </select>
          <p id="eventType-hint" className="form-hint">
            Choose the celebration type to tailor planning defaults.
          </p>
          {errors.eventType && (
            <p id="eventType-error" className="error-message" role="alert">
              {errors.eventType}
            </p>
          )}
        </div>

        {/* Event Name (Optional) */}
        <div className="form-group">
          <label htmlFor="eventName" className="form-label">
            Event Name <span className="field-requirement">(optional)</span>
          </label>
          <input
            type="text"
            id="eventName"
            name="eventName"
            value={formData.eventName}
            onChange={handleChange}
            disabled={isLoading}
            placeholder="e.g., Ananya & Vikram's Sangeet"
            className="form-input"
            aria-describedby="eventName-hint"
          />
          <p id="eventName-hint" className="form-hint">
            A descriptive title for this celebration.
          </p>
        </div>

        {/* Event Date (Optional) */}
        <div className="form-group">
          <label htmlFor="eventDate" className="form-label">
            Event Date <span className="field-requirement">(optional)</span>
          </label>
          <input
            type="date"
            id="eventDate"
            name="eventDate"
            value={formData.eventDate}
            onChange={handleChange}
            disabled={isLoading}
            className="form-input"
            aria-describedby="eventDate-hint"
          />
          <p id="eventDate-hint" className="form-hint">
            Target date for countdown milestone schedules.
          </p>
        </div>

        {/* Event Location (Optional) */}
        <div className="form-group">
          <label htmlFor="eventLocation" className="form-label">
            Event Location <span className="field-requirement">(optional)</span>
          </label>
          <input
            type="text"
            id="eventLocation"
            name="eventLocation"
            value={formData.eventLocation}
            onChange={handleChange}
            disabled={isLoading}
            placeholder="e.g., Bengaluru, Karnataka"
            className="form-input"
            aria-describedby="eventLocation-hint"
          />
          <p id="eventLocation-hint" className="form-hint">
            City or venue region for local vendor planning.
          </p>
        </div>

        {/* Expected Number of Guests (Required) */}
        <div className="form-group">
          <label htmlFor="guestCount" className="form-label">
            Expected Number of Guests <span className="required-indicator" aria-hidden="true">*</span>
            <span className="field-requirement">(required)</span>
          </label>
          <input
            type="number"
            id="guestCount"
            name="guestCount"
            ref={guestCountRef}
            min="1"
            max="100000"
            step="1"
            value={formData.guestCount}
            onChange={handleChange}
            disabled={isLoading}
            placeholder="e.g., 150"
            className={`form-input ${errors.guestCount ? 'input-error' : ''}`}
            aria-required="true"
            aria-invalid={Boolean(errors.guestCount)}
            aria-describedby={errors.guestCount ? 'guestCount-error guestCount-hint' : 'guestCount-hint'}
          />
          <p id="guestCount-hint" className="form-hint">
            Whole number of attendees (minimum 1, maximum 1,00,000).
          </p>
          {errors.guestCount && (
            <p id="guestCount-error" className="error-message" role="alert">
              {errors.guestCount}
            </p>
          )}
        </div>

        {/* Total Budget in INR (Required) */}
        <div className="form-group">
          <label htmlFor="totalBudget" className="form-label">
            Total Budget (₹ INR) <span className="required-indicator" aria-hidden="true">*</span>
            <span className="field-requirement">(required)</span>
          </label>
          <input
            type="number"
            id="totalBudget"
            name="totalBudget"
            ref={totalBudgetRef}
            min="1"
            max="100000000"
            step="1000"
            value={formData.totalBudget}
            onChange={handleChange}
            disabled={isLoading}
            placeholder="e.g., 500000"
            className={`form-input ${errors.totalBudget ? 'input-error' : ''}`}
            aria-required="true"
            aria-invalid={Boolean(errors.totalBudget)}
            aria-describedby={errors.totalBudget ? 'totalBudget-error totalBudget-hint' : 'totalBudget-hint'}
          />
          <p id="totalBudget-hint" className="form-hint">
            Planned spending in Indian Rupees (₹), greater than 0.
          </p>
          {errors.totalBudget && (
            <p id="totalBudget-error" className="error-message" role="alert">
              {errors.totalBudget}
            </p>
          )}
        </div>
      </div>

      {/* Preferences & Requirements (Optional) */}
      <div className="form-group full-width">
        <label htmlFor="eventPreferences" className="form-label">
          Event Preferences &amp; Special Requirements <span className="field-requirement">(optional)</span>
        </label>
        <textarea
          id="eventPreferences"
          name="eventPreferences"
          rows={3}
          value={formData.eventPreferences}
          onChange={handleChange}
          disabled={isLoading}
          placeholder="e.g., Outdoor evening lawn setting, traditional South Indian vegetarian catering, acoustic live band."
          className="form-input form-textarea"
          aria-describedby="eventPreferences-hint"
        />
        <p id="eventPreferences-hint" className="form-hint">
          Any specific theme preferences, dietary constraints, or venue requirements.
        </p>
      </div>

      <div className="form-actions">
        <button
          type="submit"
          className="btn-primary"
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? (
            <span className="btn-loading-content">
              <span className="spinner-inline" aria-hidden="true" />
              Generating Plan...
            </span>
          ) : (
            'Generate My Plan'
          )}
        </button>
      </div>
    </form>
  );
};
