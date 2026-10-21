export type EventType = 'wedding' | 'birthday' | 'community' | '';

export interface PlannerFormData {
  eventType: EventType;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  guestCount: string;
  totalBudget: string;
  eventPreferences: string;
}

export interface FormErrors {
  eventType?: string;
  guestCount?: string;
  totalBudget?: string;
}

export interface PlanEngineInfo {
  type: 'ai' | 'deterministic';
  model: string;
  provider: 'google-gemini' | 'rule-based' | 'rule-based-fallback';
  disclaimer: string;
  fallbackReason?: string;
}

export interface PlanIdea {
  id: string;
  title: string;
  category: string;
  description: string;
}

export interface PlanBudgetItem {
  category: string;
  allocatedInr: number;
  percentage: number;
  description: string;
}

export interface PlanBudgetBreakdown {
  totalBudgetInr: number;
  currency: 'INR';
  categories: PlanBudgetItem[];
  disclaimer?: string;
}

export interface PlanTimelinePhase {
  phase: string;
  timeframe: string;
  targetDate?: string;
  tasks: string[];
}

export interface PlanTimeline {
  timelineType: 'date_relative' | 'relative';
  targetDate: string | null;
  phases: PlanTimelinePhase[];
}

export interface VendorChecklistItem {
  id: string;
  category: string;
  task: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'booked';
}

export interface PlanOutput {
  engine: PlanEngineInfo;
  summary: {
    eventType: 'wedding' | 'birthday' | 'community';
    eventName?: string;
    eventDate?: string;
    eventLocation?: string;
    guestCount: number;
    budgetInr: number;
    preferences?: string;
  };
  personalizedIdeas: PlanIdea[];
  budgetBreakdown: PlanBudgetBreakdown;
  planningTimeline: PlanTimeline;
  vendorChecklist: VendorChecklistItem[];
}

export interface PlanApiSuccessResponse {
  success: true;
  data: PlanOutput;
}

export interface PlanApiErrorResponse {
  success: false;
  error: string;
  details?: string[] | Record<string, string>;
}

export type PlanApiResponse = PlanApiSuccessResponse | PlanApiErrorResponse;
