import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app';
import { GeminiPlanCache } from '../src/services/geminiCache';
import { GeminiClientLike } from '../src/services/geminiService';
import { buildPlanBudget } from '../src/services/budgetService';
import { offsetDays, reconcileTimelinePhases } from '../src/services/timelineService';

describe('Bounded Gemini Plan Cache & Shared Planning Logic', () => {
  const sampleValidAiResponse = {
    personalizedIdeas: [
      {
        title: 'Illuminated Mandap Focal Point',
        category: 'Decor & Theme',
        description: 'Center the ceremony around an elevated floral mandap with soft ambient backlighting.',
      },
      {
        title: 'Authentic Regional Culinary Stations',
        category: 'Catering Concept',
        description: 'Curated regional live stations aligned with authentic culinary preferences.',
      },
      {
        title: 'Sangeet Choreography Segment',
        category: 'Entertainment',
        description: 'Organize a structured 45-minute family performance sequence followed by high-energy DJ sets.',
      },
    ],
    budgetCategories: [
      { category: 'Catering & Hospitality', percentage: 35, description: 'Buffet dining and beverages' },
      { category: 'Venue & Banquet', percentage: 25, description: 'Banquet hall rental' },
      { category: 'Decor & Floral', percentage: 20, description: 'Mandap and stage florals' },
      { category: 'Photography & Media', percentage: 10, description: 'Candid and video coverage' },
      { category: 'Contingency Reserve', percentage: 10, description: 'Emergency buffer' },
    ],
    timelinePhases: [
      { phase: 'Phase 1: Initial Bookings', timeframe: '6 Months Prior', tasks: ['Lock banquet hall', 'Appoint photographer'] },
      { phase: 'Phase 2: Tasting & Decor', timeframe: '3 Months Prior', tasks: ['Menu tasting', 'Approve decor design'] },
      { phase: 'Phase 3: Final Fittings', timeframe: '1 Month Prior', tasks: ['Outfit fittings', 'RSVP count freeze'] },
      { phase: 'Phase 4: Celebration Day', timeframe: 'Event Day', tasks: ['Morning setup', 'Ceremonial execution'] },
    ],
    vendorChecklist: [
      { category: 'Venue', task: 'Sign banquet contract with timings', priority: 'high' as const },
      { category: 'Catering', task: 'Freeze dinner menu and live counters', priority: 'high' as const },
      { category: 'Photography', task: 'Confirm raw file and teaser delivery rights', priority: 'medium' as const },
      { category: 'Decor', task: 'Verify floral delivery schedule', priority: 'medium' as const },
    ],
  };

  const createCountingMockClient = (options?: {
    output?: unknown;
    shouldFail?: boolean;
    failMessage?: string;
  }) => {
    let calls = 0;
    const client: GeminiClientLike = {
      models: {
        async generateContent() {
          calls += 1;
          if (options?.shouldFail) {
            throw new Error(options.failMessage || 'Simulated Gemini provider outage');
          }
          return {
            text: JSON.stringify(options?.output || sampleValidAiResponse),
          };
        },
      },
    };

    return {
      client,
      getCallCount: () => calls,
    };
  };

  describe('1. Cache Hit & Model Call Avoidance on Equivalent Requests', () => {
    it('equivalent requests reuse cached validated model output without calling Gemini again', async () => {
      const { client, getCallCount } = createCountingMockClient();
      const testCache = new GeminiPlanCache();
      const app = createApp({ geminiClient: client, geminiCache: testCache });

      const payload = {
        eventType: 'wedding',
        guestCount: 150,
        budgetInr: 500000,
        eventName: 'Sharma Wedding',
        eventLocation: 'Jaipur',
        preferences: 'Royal traditional theme',
      };

      // First request: Cache Miss -> Gemini called
      const res1 = await request(app).post('/api/plans/generate').send(payload);
      assert.strictEqual(res1.status, 200);
      assert.strictEqual(res1.body.success, true);
      assert.strictEqual(res1.body.data.engine.type, 'ai');
      assert.strictEqual(getCallCount(), 1);
      assert.strictEqual(testCache.getStats().hits, 0);
      assert.strictEqual(testCache.getStats().misses, 1);
      assert.strictEqual(testCache.getStats().size, 1);

      // Second identical request: Cache Hit -> Gemini NOT called again
      const res2 = await request(app).post('/api/plans/generate').send(payload);
      assert.strictEqual(res2.status, 200);
      assert.strictEqual(res2.body.success, true);
      assert.strictEqual(res2.body.data.engine.type, 'ai');
      assert.strictEqual(getCallCount(), 1, 'Gemini model should NOT be called on second equivalent request');
      assert.strictEqual(testCache.getStats().hits, 1);

      // Validate identical ideas and checklist
      assert.strictEqual(res1.body.data.personalizedIdeas.length, res2.body.data.personalizedIdeas.length);
      assert.strictEqual(res1.body.data.personalizedIdeas[0].title, res2.body.data.personalizedIdeas[0].title);
      assert.strictEqual(res1.body.data.vendorChecklist.length, res2.body.data.vendorChecklist.length);
    });
  });

  describe('2. Input Differentiation & Isolation', () => {
    it('different generation inputs produce distinct cache keys and do not incorrectly share cached output', async () => {
      const { client, getCallCount } = createCountingMockClient();
      const testCache = new GeminiPlanCache();
      const app = createApp({ geminiClient: client, geminiCache: testCache });

      const base = {
        eventType: 'wedding',
        guestCount: 100,
        budgetInr: 500000,
        preferences: 'indoor banquet',
      };

      // Request 1: Base wedding
      await request(app).post('/api/plans/generate').send(base);
      assert.strictEqual(getCallCount(), 1);

      // Request 2: Different eventType (birthday)
      await request(app).post('/api/plans/generate').send({ ...base, eventType: 'birthday' });
      assert.strictEqual(getCallCount(), 2, 'Different eventType must cause fresh generation');

      // Request 3: Different guestCount (500)
      await request(app).post('/api/plans/generate').send({ ...base, guestCount: 500 });
      assert.strictEqual(getCallCount(), 3, 'Different guestCount must cause fresh generation');

      // Request 4: Different preferences (outdoor garden)
      await request(app).post('/api/plans/generate').send({ ...base, preferences: 'outdoor garden' });
      assert.strictEqual(getCallCount(), 4, 'Different preferences must cause fresh generation');

      // Request 5: Different eventLocation
      await request(app).post('/api/plans/generate').send({ ...base, eventLocation: 'Goa' });
      assert.strictEqual(getCallCount(), 5, 'Different eventLocation must cause fresh generation');

      // Request 6: Different budgetInr (2,000,000)
      await request(app).post('/api/plans/generate').send({ ...base, budgetInr: 2000000 });
      assert.strictEqual(getCallCount(), 6, 'Different budgetInr must cause fresh generation');

      // Re-request original base payload: MUST hit cache
      await request(app).post('/api/plans/generate').send(base);
      assert.strictEqual(getCallCount(), 6, 'Original base payload must hit cache without incrementing calls');
      assert.strictEqual(testCache.getStats().hits, 1);
    });

    it('prevents delimiter and structured key collisions between distinct inputs', () => {
      const cache = new GeminiPlanCache();
      const keyA = cache.computeKey({
        eventType: 'wedding',
        guestCount: 100,
        budgetInr: 500000,
        eventName: 'alpha::beta',
        eventLocation: 'city',
      });
      const keyB = cache.computeKey({
        eventType: 'wedding',
        guestCount: 100,
        budgetInr: 500000,
        eventName: 'alpha',
        eventLocation: 'beta::city',
      });
      assert.notStrictEqual(keyA, keyB, 'Collision between delimiter-containing fields must not occur');
    });
  });

  describe('3. Expiry and Capacity Eviction', () => {
    it('expired cache entries cause regeneration after TTL', async () => {
      const { client, getCallCount } = createCountingMockClient();
      // Configure cache with very short TTL (30ms)
      const shortTtlCache = new GeminiPlanCache({ ttlMs: 30 });
      const app = createApp({ geminiClient: client, geminiCache: shortTtlCache });

      const payload = { eventType: 'wedding', guestCount: 80, budgetInr: 300000 };

      // Request 1: initial generation
      await request(app).post('/api/plans/generate').send(payload);
      assert.strictEqual(getCallCount(), 1);

      // Immediate repeat: cache hit
      await request(app).post('/api/plans/generate').send(payload);
      assert.strictEqual(getCallCount(), 1);

      // Wait 50ms for entry to expire
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Request 3: expired -> model must regenerate
      await request(app).post('/api/plans/generate').send(payload);
      assert.strictEqual(getCallCount(), 2, 'Model must be called again after TTL expiration');
    });

    it('capacity eviction removes oldest entry when maxEntries is exceeded', async () => {
      const { client, getCallCount } = createCountingMockClient();
      // Configure cache with capacity of 2
      const smallCache = new GeminiPlanCache({ maxEntries: 2 });
      const app = createApp({ geminiClient: client, geminiCache: smallCache });

      // Insert Key 1
      await request(app).post('/api/plans/generate').send({ eventType: 'wedding', guestCount: 10, budgetInr: 100000 });
      assert.strictEqual(getCallCount(), 1);

      // Insert Key 2
      await request(app).post('/api/plans/generate').send({ eventType: 'birthday', guestCount: 20, budgetInr: 100000 });
      assert.strictEqual(getCallCount(), 2);
      assert.strictEqual(smallCache.getStats().size, 2);

      // Insert Key 3 (triggers eviction of Key 1)
      await request(app).post('/api/plans/generate').send({ eventType: 'community', guestCount: 30, budgetInr: 100000 });
      assert.strictEqual(getCallCount(), 3);
      assert.strictEqual(smallCache.getStats().size, 2);
      assert.strictEqual(smallCache.getStats().evictions, 1);

      // Re-request Key 2: Should still be cached (was not evicted)
      await request(app).post('/api/plans/generate').send({ eventType: 'birthday', guestCount: 20, budgetInr: 100000 });
      assert.strictEqual(getCallCount(), 3, 'Key 2 should still be cached');

      // Re-request Key 1: Was evicted, must regenerate
      await request(app).post('/api/plans/generate').send({ eventType: 'wedding', guestCount: 10, budgetInr: 100000 });
      assert.strictEqual(getCallCount(), 4, 'Key 1 was evicted and must trigger regeneration');
    });
  });

  describe('4. Failure and Malformed Output Cache Resistance', () => {
    it('failed or malformed Gemini output is never cached', async () => {
      // Client initially throws
      const { client, getCallCount } = createCountingMockClient({
        shouldFail: true,
        failMessage: 'Gemini server 503 unavailable',
      });
      const testCache = new GeminiPlanCache();
      const app = createApp({ geminiClient: client, geminiCache: testCache });

      const payload = { eventType: 'wedding', guestCount: 75, budgetInr: 400000 };

      // Request fails AI generation -> falls back to deterministic rule-based
      const res = await request(app).post('/api/plans/generate').send(payload);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.engine.type, 'deterministic');
      assert.strictEqual(getCallCount(), 1);

      // Cache MUST NOT store failed responses
      assert.strictEqual(testCache.getStats().size, 0, 'Cache must remain empty after provider failure');

      // Now create app with working client on the same cache
      const working = createCountingMockClient();
      const recoveryApp = createApp({ geminiClient: working.client, geminiCache: testCache });

      const res2 = await request(recoveryApp).post('/api/plans/generate').send(payload);
      assert.strictEqual(res2.status, 200);
      assert.strictEqual(res2.body.data.engine.type, 'ai');
      assert.strictEqual(working.getCallCount(), 1, 'Working client must be invoked');
      assert.strictEqual(testCache.getStats().size, 1, 'Valid response successfully cached');
    });
  });

  describe('5. Budget Isolation and Exact Dynamic Budget Recalculation on Cache Hits', () => {
    it('distinct budgets do not share cached concepts; equivalent representations hit cache and recalculate exact integer paise allocations', async () => {
      const { client, getCallCount } = createCountingMockClient();
      const testCache = new GeminiPlanCache();
      const app = createApp({ geminiClient: client, geminiCache: testCache });

      // Request 1: Budget = 5,00,000
      const res1 = await request(app).post('/api/plans/generate').send({
        eventType: 'wedding',
        guestCount: 120,
        budgetInr: 500000,
        preferences: 'south indian traditional',
      });
      assert.strictEqual(res1.status, 200);
      assert.strictEqual(getCallCount(), 1);
      assert.strictEqual(res1.body.data.budgetBreakdown.totalBudgetInr, 500000);
      const total1 = res1.body.data.budgetBreakdown.categories.reduce((s: number, c: { allocatedInr: number }) => s + c.allocatedInr, 0);
      assert.strictEqual(Math.round(total1 * 100) / 100, 500000);

      // Request 2: SAME parameters with EQUIVALENT numeric representation (500000.00) -> Cache hit
      const res2 = await request(app).post('/api/plans/generate').send({
        eventType: 'wedding',
        guestCount: 120,
        budgetInr: 500000.00,
        preferences: 'south indian traditional',
      });
      assert.strictEqual(res2.status, 200);
      assert.strictEqual(getCallCount(), 1, 'Equivalent normalized budget (500000 vs 500000.00) must hit cache');
      assert.strictEqual(testCache.getStats().hits, 1);

      // Request 3: Radically different budget (₹5,00,00,000) -> MUST NOT hit cache (budget-sensitive isolation)
      const res3 = await request(app).post('/api/plans/generate').send({
        eventType: 'wedding',
        guestCount: 120,
        budgetInr: 50000000,
        preferences: 'south indian traditional',
      });
      assert.strictEqual(res3.status, 200);
      assert.strictEqual(getCallCount(), 2, 'Different budget must not reuse cached concepts from modest budget');
      assert.strictEqual(res3.body.data.budgetBreakdown.totalBudgetInr, 50000000);
      const total3 = res3.body.data.budgetBreakdown.categories.reduce((s: number, c: { allocatedInr: number }) => s + c.allocatedInr, 0);
      assert.strictEqual(Math.round(total3 * 100) / 100, 50000000);

      // Verify category allocations are scaled cleanly and non-negative
      for (const cat of res3.body.data.budgetBreakdown.categories) {
        assert.ok(cat.allocatedInr >= 0);
        assert.ok(Number.isFinite(cat.allocatedInr));
      }
    });
  });

  describe('6. Dynamic Timeline Recalculation on Cache Hits', () => {
    it('timeline target dates are recalculated correctly when eventDate changes on cache hits', async () => {
      const { client, getCallCount } = createCountingMockClient();
      const testCache = new GeminiPlanCache();
      const app = createApp({ geminiClient: client, geminiCache: testCache });

      const baseInput = {
        eventType: 'wedding',
        guestCount: 150,
        budgetInr: 600000,
        eventName: 'Mehra Wedding',
      };

      // Request 1: Scheduled for 2026-10-15
      const res1 = await request(app).post('/api/plans/generate').send({
        ...baseInput,
        eventDate: '2026-10-15',
      });
      assert.strictEqual(res1.status, 200);
      assert.strictEqual(getCallCount(), 1);
      assert.strictEqual(res1.body.data.planningTimeline.timelineType, 'date_relative');
      assert.strictEqual(res1.body.data.planningTimeline.targetDate, '2026-10-15');
      const phases1 = res1.body.data.planningTimeline.phases;
      assert.strictEqual(phases1[phases1.length - 1].targetDate, '2026-10-15');

      // Request 2: SAME parameters, but DIFFERENT eventDate (2027-04-20) -> Cache hit
      const res2 = await request(app).post('/api/plans/generate').send({
        ...baseInput,
        eventDate: '2027-04-20',
      });
      assert.strictEqual(res2.status, 200);
      assert.strictEqual(getCallCount(), 1, 'Gemini must NOT be called again');
      assert.strictEqual(res2.body.data.planningTimeline.timelineType, 'date_relative');
      assert.strictEqual(res2.body.data.planningTimeline.targetDate, '2027-04-20');
      const phases2 = res2.body.data.planningTimeline.phases;
      assert.strictEqual(phases2[phases2.length - 1].targetDate, '2027-04-20');

      // Verify strictly ascending dates for the new year 2027
      for (let i = 0; i < phases2.length - 1; i++) {
        assert.ok(
          phases2[i].targetDate < phases2[i + 1].targetDate,
          `Phase ${i} (${phases2[i].targetDate}) must precede Phase ${i + 1} (${phases2[i + 1].targetDate})`
        );
      }

      // Request 3: SAME parameters, but NO eventDate (relative mode) -> Cache hit
      const res3 = await request(app).post('/api/plans/generate').send(baseInput);
      assert.strictEqual(res3.status, 200);
      assert.strictEqual(getCallCount(), 1, 'Gemini must NOT be called again');
      assert.strictEqual(res3.body.data.planningTimeline.timelineType, 'relative');
      assert.strictEqual(res3.body.data.planningTimeline.targetDate, null);
      for (const phase of res3.body.data.planningTimeline.phases) {
        assert.strictEqual(phase.targetDate, undefined);
      }
    });
  });

  describe('7. Shared Planning Helpers Correctness & De-duplication', () => {
    it('offsetDays correctly computes UTC date arithmetic across month boundaries and leap years', () => {
      // Month boundary
      assert.strictEqual(offsetDays('2026-10-31', 1), '2026-11-01');
      assert.strictEqual(offsetDays('2026-11-01', -1), '2026-10-31');

      // Year boundary
      assert.strictEqual(offsetDays('2026-12-31', 1), '2027-01-01');
      assert.strictEqual(offsetDays('2027-01-01', -1), '2026-12-31');

      // Leap year 2028 (February 29)
      assert.strictEqual(offsetDays('2028-02-28', 1), '2028-02-29');
      assert.strictEqual(offsetDays('2028-03-01', -1), '2028-02-29');

      // Non-leap year 2026 (February 28 -> March 01)
      assert.strictEqual(offsetDays('2026-02-28', 1), '2026-03-01');

      // Multi-month offset
      assert.strictEqual(offsetDays('2026-10-15', -180), '2026-04-18');
    });

    it('buildPlanBudget standardizes budget construction with exact integer paise reconciliation', () => {
      const categories = [
        { category: 'Venue', percentage: 33.33, description: 'Venue rental' },
        { category: 'Catering', percentage: 33.33, description: 'Catering service' },
        { category: 'Decor', percentage: 33.34, description: 'Decor & floral' },
      ];

      const budget = 100000;
      const planBudget = buildPlanBudget(categories, budget);

      assert.strictEqual(planBudget.totalBudgetInr, 100000);
      assert.strictEqual(planBudget.currency, 'INR');
      assert.ok(planBudget.disclaimer.includes('Estimated allocation breakdown'));
      const sum = planBudget.categories.reduce((s, c) => s + c.allocatedInr, 0);
      assert.strictEqual(sum, 100000);
    });

    it('reconcileTimelinePhases guarantees strictly monotonic ascending phase target dates', () => {
      const rawPhases = [
        { phase: 'Booking', timeframe: '6 Months', tasks: ['Task 1'] },
        { phase: 'Design', timeframe: '3 Months', tasks: ['Task 2'] },
        { phase: 'Finalization', timeframe: '1 Month', tasks: ['Task 3'] },
        { phase: 'Rehearsal', timeframe: '1 Week', tasks: ['Task 4'] },
        { phase: 'Day of Event', timeframe: 'Event Day', tasks: ['Task 5'] },
      ];

      const timeline = reconcileTimelinePhases(rawPhases, '2026-12-25');
      assert.strictEqual(timeline.timelineType, 'date_relative');
      assert.strictEqual(timeline.targetDate, '2026-12-25');
      assert.strictEqual(timeline.phases.length, 5);

      for (let i = 0; i < timeline.phases.length - 1; i++) {
        const curDate = timeline.phases[i]?.targetDate ?? '';
        const nextDate = timeline.phases[i + 1]?.targetDate ?? '';
        assert.ok(curDate < nextDate, `Phase ${i} (${curDate}) must be before Phase ${i + 1} (${nextDate})`);
      }
      assert.strictEqual(timeline.phases[4]?.targetDate, '2026-12-25');
    });
  });

  describe('8. Concurrency & Cache Integrity', () => {
    it('concurrent equivalent requests do not corrupt cache state or produce invalid outputs', async () => {
      const { client, getCallCount } = createCountingMockClient();
      const testCache = new GeminiPlanCache();
      const app = createApp({ geminiClient: client, geminiCache: testCache });

      const payload = {
        eventType: 'wedding',
        guestCount: 150,
        budgetInr: 500000,
        eventName: 'Sharma Wedding',
        eventLocation: 'Jaipur',
        preferences: 'Royal traditional theme',
      };

      // Launch 5 concurrent requests with identical payloads
      const responses = await Promise.all([
        request(app).post('/api/plans/generate').send(payload),
        request(app).post('/api/plans/generate').send(payload),
        request(app).post('/api/plans/generate').send(payload),
        request(app).post('/api/plans/generate').send(payload),
        request(app).post('/api/plans/generate').send(payload),
      ]);

      for (const res of responses) {
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);
        assert.strictEqual(res.body.data.engine.type, 'ai');
        assert.strictEqual(res.body.data.budgetBreakdown.totalBudgetInr, 500000);
      }

      // Cache state is clean and uncorrupted
      assert.ok(getCallCount() >= 1, 'Client should have been called for initial requests');
      assert.strictEqual(testCache.getStats().size, 1);
      assert.ok(testCache.getStats().size <= testCache.getStats().maxEntries);

      // Subsequent request hits cache cleanly
      const followUp = await request(app).post('/api/plans/generate').send(payload);
      assert.strictEqual(followUp.status, 200);
      assert.strictEqual(testCache.getStats().hits >= 1, true);
    });
  });
});
