import {
  GeneratePlanInput,
  PlanOutput,
  SupportedEventType,
} from '../types/plan';
import { buildPlanBudget } from './budgetService';
import { reconcileTimelinePhases } from './timelineService';

const FALLBACK_CATEGORIES: Record<
  SupportedEventType,
  Array<{ category: string; percentage: number; description: string }>
> = {
  wedding: [
    { category: 'Catering & Hospitality', percentage: 35, description: 'Buffet dining, live counters, and guest service' },
    { category: 'Venue & Banquet', percentage: 25, description: 'Ceremony hall, banquet lawns, and staging space' },
    { category: 'Floral & Mandap Styling', percentage: 15, description: 'Floral backdrop, stage styling, and entrance decor' },
    { category: 'Photography & Media', percentage: 10, description: 'Candid event photography and video coverage' },
    { category: 'Music, Sound & Attire', percentage: 10, description: 'Sound setup, DJ performance, and ceremonial attire' },
    { category: 'Contingency Reserve', percentage: 5, description: 'Unplanned expenses and emergency provisions' },
  ],
  birthday: [
    { category: 'Food, Beverages & Cake', percentage: 40, description: 'Snacks, party refreshments, and custom celebratory cake' },
    { category: 'Venue & Party Space', percentage: 25, description: 'Party hall, cafe banquet, or terrace rental' },
    { category: 'Entertainment & Games', percentage: 15, description: 'Party games, music playlist, and activity host' },
    { category: 'Theme Decor & Styling', percentage: 12, description: 'Balloons, thematic backdrop, and centerpieces' },
    { category: 'Favors & Photography', percentage: 8, description: 'Guest takeaway gifts and event photography' },
  ],
  community: [
    { category: 'Venue & Ground Permits', percentage: 30, description: 'Public ground hire, civic permits, and seating' },
    { category: 'AV Staging, Sound & Lighting', percentage: 25, description: 'Public address audio system, stage podium, and lighting' },
    { category: 'Refreshments & Water Stations', percentage: 20, description: 'Community snacks, tea/coffee, and water points' },
    { category: 'Signage & Logistics', percentage: 15, description: 'Direction boards, banners, and crowd safety barriers' },
    { category: 'Emergency & Contingency', percentage: 10, description: 'First aid kits and emergency buffer' },
  ],
};

const FALLBACK_TIMELINE: Record<
  SupportedEventType,
  Array<{ phase: string; timeframe: string; tasks: string[] }>
> = {
  wedding: [
    { phase: 'Phase 1: Foundation & Bookings', timeframe: '6 Months Prior', tasks: ['Lock ceremony venue', 'Confirm core caterer and photographer'] },
    { phase: 'Phase 2: Design & Vendor Approvals', timeframe: '3 Months Prior', tasks: ['Approve floral theme', 'Order invitations and finalize menu'] },
    { phase: 'Phase 3: Final Coordination', timeframe: '1 Month Prior', tasks: ['Confirm guest RSVPs', 'Final vendor schedule walk-through'] },
    { phase: 'Phase 4: Celebration Day', timeframe: 'Event Day', tasks: ['Morning setup check', 'Coordinate ceremonial schedule'] },
  ],
  birthday: [
    { phase: 'Phase 1: Theme & Venue', timeframe: '4 Weeks Prior', tasks: ['Choose party theme', 'Reserve venue space and order cake'] },
    { phase: 'Phase 2: Invitations & Activities', timeframe: '2 Weeks Prior', tasks: ['Send invitations', 'Arrange party games and music'] },
    { phase: 'Phase 3: Celebration Day', timeframe: 'Event Day', tasks: ['Decorate party space', 'Welcome guests and cut cake'] },
  ],
  community: [
    { phase: 'Phase 1: Planning & Approvals', timeframe: '8 Weeks Prior', tasks: ['Secure civic ground permits', 'Form volunteer committee'] },
    { phase: 'Phase 2: Logistics & Outreach', timeframe: '4 Weeks Prior', tasks: ['Book AV sound equipment', 'Distribute community notices'] },
    { phase: 'Phase 3: Execution Day', timeframe: 'Event Day', tasks: ['Setup stage and sound', 'Conduct community program'] },
  ],
};

const FALLBACK_CHECKLIST: Record<
  SupportedEventType,
  Array<{ category: string; task: string; priority: 'high' | 'medium' | 'low' }>
> = {
  wedding: [
    { category: 'Venue', task: 'Sign venue contract with specified timings', priority: 'high' },
    { category: 'Catering', task: 'Finalize menu items and headcount guarantee', priority: 'high' },
    { category: 'Photography', task: 'Confirm deliverable rights and shot list', priority: 'medium' },
    { category: 'Decor', task: 'Review mandap and stage design mockup', priority: 'medium' },
    { category: 'Sound', task: 'Confirm audio permissions and DJ playlist', priority: 'low' },
  ],
  birthday: [
    { category: 'Venue', task: 'Confirm party hall reservation and entry timings', priority: 'high' },
    { category: 'Bakery', task: 'Order customized birthday cake and delivery time', priority: 'high' },
    { category: 'Decor', task: 'Arrange balloon decorations and party backdrop', priority: 'medium' },
    { category: 'Favors', task: 'Pack guest takeaway favor bags', priority: 'low' },
  ],
  community: [
    { category: 'Permits', task: 'Obtain civic authority and sound permits', priority: 'high' },
    { category: 'AV Sound', task: 'Test microphone and sound speaker systems', priority: 'high' },
    { category: 'Safety', task: 'Brief volunteer team on emergency exits and first aid', priority: 'medium' },
    { category: 'Signage', task: 'Erect directional signs and entrance banner', priority: 'low' },
  ],
};

/**
 * Lightweight, deterministic fallback plan generator.
 * Used when Gemini AI is unconfigured or unavailable, providing
 * immediate, structured planning deliverables with exact integer paise reconciliation.
 */
export function generatePlan(
  input: GeneratePlanInput,
  options?: { isFallback?: boolean; fallbackReason?: string }
): PlanOutput {
  const eventType = input.eventType;
  const isFallback = options?.isFallback ?? false;

  const rawCategories = FALLBACK_CATEGORIES[eventType] || FALLBACK_CATEGORIES.wedding;
  const rawPhases = FALLBACK_TIMELINE[eventType] || FALLBACK_TIMELINE.wedding;
  const rawChecklist = FALLBACK_CHECKLIST[eventType] || FALLBACK_CHECKLIST.wedding;

  const budgetBreakdown = buildPlanBudget(rawCategories, input.budgetInr);
  const planningTimeline = reconcileTimelinePhases(rawPhases, input.eventDate);

  const personalizedIdeas = [
    {
      id: 'idea-01',
      title: `${eventType.charAt(0).toUpperCase() + eventType.slice(1)} Celebration Concept`,
      category: 'Concept & Theme',
      description: `Structured ${eventType} celebration for ${input.guestCount} guests${input.preferences ? ` with focus on ${input.preferences}` : ''}.`,
    },
    {
      id: 'idea-02',
      title: 'Hospitality & Dining Experience',
      category: 'Guest Experience',
      description: `Coordinated food service and beverage stations suited for ${input.guestCount} attendees.`,
    },
    {
      id: 'idea-03',
      title: 'Milestone Commemoration',
      category: 'Program & Activities',
      description: `Curated ceremonial moments and photography capturing key highlights of the ${eventType}.`,
    },
  ];

  const vendorChecklist = rawChecklist.map((item, idx) => ({
    id: `ven-${String(idx + 1).padStart(2, '0')}`,
    category: item.category,
    task: item.task,
    priority: item.priority,
    status: 'pending' as const,
  }));

  return {
    engine: {
      type: 'deterministic',
      model: 'rule-based-v1',
      provider: isFallback ? 'rule-based-fallback' : 'rule-based',
      disclaimer: isFallback
        ? 'This plan was generated using deterministic rule-based algorithms because the AI planning service was unavailable or unconfigured. Financial figures are estimates for planning purposes, not confirmed vendor quotes.'
        : 'This plan was generated using deterministic rule-based estimation algorithms and domain heuristics, not a generative AI model. Financial figures are estimates for planning purposes, not confirmed vendor quotes.',
      fallbackReason: options?.fallbackReason,
    },
    summary: {
      eventType: input.eventType,
      eventName: input.eventName,
      eventDate: input.eventDate,
      eventLocation: input.eventLocation,
      guestCount: input.guestCount,
      budgetInr: input.budgetInr,
      preferences: input.preferences,
    },
    personalizedIdeas,
    budgetBreakdown,
    planningTimeline,
    vendorChecklist,
  };
}
