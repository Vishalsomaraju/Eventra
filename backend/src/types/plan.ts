export type SupportedEventType = 'wedding' | 'birthday' | 'community';

export interface GeneratePlanInput {
  eventType: SupportedEventType;
  eventName?: string;
  eventDate?: string;
  eventLocation?: string;
  guestCount: number;
  budgetInr: number;
  preferences?: string;
}

export interface PlanIdea {
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

export interface PlanBudget {
  totalBudgetInr: number;
  currency: 'INR';
  disclaimer: string;
  categories: PlanBudgetItem[];
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
  status: 'pending';
}

export interface PlanEngineInfo {
  type: 'ai' | 'deterministic';
  model: string;
  provider: 'google-gemini' | 'rule-based' | 'rule-based-fallback';
  disclaimer: string;
  fallbackReason?: string;
}

export interface PlanOutput {
  engine: PlanEngineInfo;
  summary: {
    eventType: SupportedEventType;
    eventName?: string;
    eventDate?: string;
    eventLocation?: string;
    guestCount: number;
    budgetInr: number;
    preferences?: string;
  };
  personalizedIdeas: PlanIdea[];
  budgetBreakdown: PlanBudget;
  planningTimeline: PlanTimeline;
  vendorChecklist: VendorChecklistItem[];
}

export interface PlanSuccessResponse {
  success: true;
  data: PlanOutput;
}

export interface PlanErrorResponse {
  success: false;
  error: string;
  details?: string[];
}
