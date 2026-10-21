import crypto from 'node:crypto';
import { SupportedEventType } from '../types/plan';

export interface RawAiIdea {
  title: string;
  category: string;
  description: string;
}

export interface RawAiBudgetCategory {
  category: string;
  percentage: number;
  description: string;
}

export interface RawAiTimelinePhase {
  phase: string;
  timeframe: string;
  tasks: string[];
}

export interface RawAiVendorTask {
  category: string;
  task: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Reusable generated content produced by Google Gemini.
 * Contains only generic, normalized concepts:
 * - Ideas concepts
 * - Category percentage targets (not rupee amounts)
 * - Timeline phase milestones (not hardcoded calendar dates)
 * - Vendor checklist items
 *
 * Dynamic rupee allocations and calendar date calculations are performed
 * on every cache hit to ensure request-specific values are always fresh and exact.
 */
export interface ReusableGeminiContent {
  personalizedIdeas: RawAiIdea[];
  budgetCategories: RawAiBudgetCategory[];
  timelinePhases: RawAiTimelinePhase[];
  vendorChecklist: RawAiVendorTask[];
  model: string;
}

export interface CacheEntry {
  content: ReusableGeminiContent;
  cachedAtMs: number;
  expiresAtMs: number;
}

export interface CacheKeyInput {
  eventType: SupportedEventType | string;
  guestCount: number;
  budgetInr?: number;
  eventName?: string | null;
  eventLocation?: string | null;
  preferences?: string | null;
}

export interface GeminiPlanCacheOptions {
  maxEntries?: number;
  ttlMs?: number;
}

export interface CacheStats {
  size: number;
  maxEntries: number;
  ttlMs: number;
  hits: number;
  misses: number;
  evictions: number;
}

/**
 * Process-local in-memory cache for validated Google Gemini model outputs.
 *
 * ARCHITECTURAL NOTES & BOUNDS:
 * 1. Process-local: This cache resides within the Node.js process memory. In a
 *    multi-instance or clustered deployment, each process maintains its own cache
 *    independently. Distributed deployments would require a shared store (e.g., Redis).
 * 2. Bounded memory: Hard cap on maximum entries prevents unbounded memory consumption.
 * 3. Privacy: Cache keys are cryptographic SHA-256 hex digests; raw user inputs and
 *    preferences are never exposed in keys, debug maps, or application logs.
 * 4. Only successful validated outputs are stored; provider failures or malformed responses
 *    are never cached.
 */
export class GeminiPlanCache {
  private readonly store = new Map<string, CacheEntry>();
  private maxEntries: number;
  private ttlMs: number;
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(options?: GeminiPlanCacheOptions) {
    this.maxEntries = Math.max(1, options?.maxEntries ?? 100);
    this.ttlMs = Math.max(1, options?.ttlMs ?? 15 * 60 * 1000); // Default 15 minutes
  }

  /**
   * Deterministically computes a SHA-256 cache key from inputs that dictate
   * model-generated content.
   *
   * Budget is normalized to fixed 2-decimal paise string so equivalent representations
   * (e.g., 500000 and 500000.00) share cache entries, while distinct budget scales
   * receive properly tailored, budget-appropriate plans.
   *
   * Structured JSON serialization prevents delimiter injection or collision attacks.
   */
  computeKey(input: CacheKeyInput): string {
    const normalized = {
      eventType: String(input.eventType || '').trim().toLowerCase(),
      budgetInr:
        input.budgetInr !== undefined && Number.isFinite(Number(input.budgetInr))
          ? (Math.round(Number(input.budgetInr) * 100) / 100).toFixed(2)
          : null,
      guestCount: Math.max(1, Math.round(Number(input.guestCount) || 1)),
      eventName: input.eventName ? input.eventName.trim().toLowerCase() : '',
      eventLocation: input.eventLocation ? input.eventLocation.trim().toLowerCase() : '',
      preferences: input.preferences ? input.preferences.trim().toLowerCase() : '',
    };

    const serialized = JSON.stringify(normalized);
    return crypto.createHash('sha256').update(serialized, 'utf8').digest('hex');
  }

  /**
   * Retrieves reusable model output if valid and unexpired.
   * Returns a deep clone so callers cannot mutate internal cache state.
   */
  get(key: string): ReusableGeminiContent | null {
    const entry = this.store.get(key);
    const now = Date.now();

    if (!entry) {
      this.misses += 1;
      return null;
    }

    if (now > entry.expiresAtMs) {
      this.store.delete(key);
      this.misses += 1;
      return null;
    }

    // Refresh access order (delete and re-insert) to implement LRU eviction
    this.store.delete(key);
    this.store.set(key, entry);

    this.hits += 1;

    return {
      personalizedIdeas: entry.content.personalizedIdeas.map((i) => ({ ...i })),
      budgetCategories: entry.content.budgetCategories.map((b) => ({ ...b })),
      timelinePhases: entry.content.timelinePhases.map((p) => ({
        ...p,
        tasks: [...p.tasks],
      })),
      vendorChecklist: entry.content.vendorChecklist.map((v) => ({ ...v })),
      model: entry.content.model,
    };
  }

  /**
   * Stores validated reusable content in the cache, enforcing capacity and expiry eviction.
   */
  set(key: string, content: ReusableGeminiContent): void {
    const now = Date.now();

    // 1. Purge expired entries if reaching capacity
    if (this.store.size >= this.maxEntries) {
      for (const [k, v] of this.store.entries()) {
        if (now > v.expiresAtMs) {
          this.store.delete(k);
        }
      }
    }

    // 2. If still at capacity, evict the oldest entry (LRU via insertion order)
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) {
        this.store.delete(oldestKey);
        this.evictions += 1;
      }
    }

    this.store.set(key, {
      content: {
        personalizedIdeas: content.personalizedIdeas.map((i) => ({ ...i })),
        budgetCategories: content.budgetCategories.map((b) => ({ ...b })),
        timelinePhases: content.timelinePhases.map((p) => ({
          ...p,
          tasks: [...p.tasks],
        })),
        vendorChecklist: content.vendorChecklist.map((v) => ({ ...v })),
        model: content.model,
      },
      cachedAtMs: now,
      expiresAtMs: now + this.ttlMs,
    });
  }

  /**
   * Clears all stored entries and metrics (useful for isolated unit tests).
   */
  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Returns current cache operational metrics.
   */
  getStats(): CacheStats {
    return {
      size: this.store.size,
      maxEntries: this.maxEntries,
      ttlMs: this.ttlMs,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
    };
  }

  /**
   * Reconfigures cache bounds (useful for test suites).
   */
  setOptions(options: GeminiPlanCacheOptions): void {
    if (options.maxEntries !== undefined) {
      this.maxEntries = Math.max(1, options.maxEntries);
    }
    if (options.ttlMs !== undefined) {
      this.ttlMs = Math.max(10, options.ttlMs);
    }
  }
}

export const defaultGeminiPlanCache = new GeminiPlanCache();
