import { PlanTimeline, PlanTimelinePhase } from '../types/plan';

/**
 * Calculates date offset in YYYY-MM-DD format relative to a base ISO date in UTC.
 */
export function offsetDays(isoDate: string, daysOffset: number): string {
  const parts = isoDate.split('-').map((p) => parseInt(p, 10));
  const year = parts[0]!;
  const month = parts[1]! - 1; // 0-indexed month
  const day = parts[2]!;

  const date = new Date(Date.UTC(year, month, day));
  date.setUTCDate(date.getUTCDate() + daysOffset);
  return date.toISOString().slice(0, 10);
}

/**
 * Reconciles timeline phases with target date calculation if eventDate is provided.
 * Guarantees strictly monotonic chronological ordering across all phases.
 *
 * Used by both AI-generated planning and cached timeline reconstruction.
 */
export function reconcileTimelinePhases(
  rawPhases: Array<{ phase: string; timeframe: string; tasks: string[] }>,
  eventDate?: string
): PlanTimeline {
  const hasDate = Boolean(eventDate);
  const phases: PlanTimelinePhase[] = [];
  const n = rawPhases.length;

  // Compute strictly ascending day offsets (offsets[i] < offsets[i+1] <= 0)
  let offsets: number[] = [];
  if (n === 1) {
    offsets = [0];
  } else {
    const defaultSteps = [-180, -120, -90, -60, -30, -14, -7, 0];
    if (n <= defaultSteps.length) {
      offsets = defaultSteps.slice(defaultSteps.length - n);
    } else {
      const maxSpan = Math.max(180, n * 14);
      for (let i = 0; i < n; i++) {
        offsets.push(Math.round(-maxSpan * (1 - i / (n - 1))));
      }
      for (let i = 1; i < offsets.length; i++) {
        if (offsets[i]! <= offsets[i - 1]!) {
          offsets[i] = offsets[i - 1]! + 1;
        }
      }
      offsets[n - 1] = 0;
    }
  }

  for (let i = 0; i < rawPhases.length; i++) {
    const raw = rawPhases[i]!;
    const isLast = i === rawPhases.length - 1;

    let targetDate: string | undefined;
    if (eventDate) {
      targetDate = isLast ? eventDate : offsetDays(eventDate, offsets[i] ?? -30);
    }

    phases.push({
      phase: raw.phase.slice(0, 100),
      timeframe: raw.timeframe.slice(0, 50),
      targetDate,
      tasks: raw.tasks.slice(0, 8).map((t) => String(t).slice(0, 200)),
    });
  }

  return {
    timelineType: hasDate ? 'date_relative' : 'relative',
    targetDate: eventDate || null,
    phases,
  };
}
