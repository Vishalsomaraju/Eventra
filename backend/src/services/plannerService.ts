import {
  GeneratePlanInput,
  PlanBudget,
  PlanBudgetItem,
  PlanIdea,
  PlanOutput,
  PlanTimeline,
  PlanTimelinePhase,
  SupportedEventType,
  VendorChecklistItem,
} from '../types/plan';

interface CategoryTemplate {
  name: string;
  percentage: number;
  description: string;
}

/**
 * Calculates category budget allocations using exact integer paise arithmetic.
 * Ensures the sum of allocated amounts equals the requested budget exactly.
 */
export function generateBudgetBreakdown(
  eventType: SupportedEventType,
  guestCount: number,
  budgetInr: number
): PlanBudget {
  let templates: CategoryTemplate[];

  if (eventType === 'wedding') {
    const isLargeWedding = guestCount > 250;
    templates = [
      {
        name: 'Catering & Dining',
        percentage: isLargeWedding ? 36 : 32,
        description: `Full course dining, live stations, beverages, and hospitality service for ${guestCount} guests.`,
      },
      {
        name: 'Venue & Stage Space',
        percentage: isLargeWedding ? 20 : 22,
        description: 'Ceremony hall, banquet lawns, dining hall rentals, and basic infrastructure.',
      },
      {
        name: 'Floral & Mandap Styling',
        percentage: 12,
        description: 'Floral arrangements, entrance arch, mandap canopy, and ambient focal styling.',
      },
      {
        name: 'Photography & Cinematography',
        percentage: 10,
        description: 'Candid event coverage, traditional portraits, teaser reels, and edited deliverables.',
      },
      {
        name: 'Bridal/Groom Attire & Makeup',
        percentage: 8,
        description: 'Ceremonial outfits, hair styling, bridal makeup, and personal grooming assistance.',
      },
      {
        name: 'DJ, Sound & Sangeet Lighting',
        percentage: 6,
        description: 'Sound engineering, party lighting, stage acoustic setup, and DJ performance.',
      },
      {
        name: 'Invitations & Guest Favors',
        percentage: isLargeWedding ? 4 : 5,
        description: 'Printed or digital invitations, guest gift hampers, and welcoming kits.',
      },
      {
        name: 'Contingency Reserve',
        percentage: isLargeWedding ? 4 : 5,
        description: 'Unplanned expenses, emergency vendor overtime, and last-minute provisions.',
      },
    ];
  } else if (eventType === 'birthday') {
    templates = [
      {
        name: 'Food, Beverages & Cake',
        percentage: 35,
        description: `Buffet snacks, beverages, main meal, and custom celebratory cake for ${guestCount} attendees.`,
      },
      {
        name: 'Venue & Party Space',
        percentage: 25,
        description: 'Indoor party hall, cafe banquet, or terrace rental suited for birthday activities.',
      },
      {
        name: 'Entertainment, Emcee & Games',
        percentage: 15,
        description: 'Activity host, party games, music playlist, magic show or mascot entertainer.',
      },
      {
        name: 'Theme Decor & Balloon Styling',
        percentage: 12,
        description: 'Personalized banner, photo backdrop, balloon garlands, and table centerpieces.',
      },
      {
        name: 'Return Gifts & Photography',
        percentage: 8,
        description: 'Curated takeaway favor bags for guests and commemorative party photography.',
      },
      {
        name: 'Contingency Reserve',
        percentage: 5,
        description: 'Buffer for additional guests, extended hall rental, and miscellaneous items.',
      },
    ];
  } else {
    // Community Event
    templates = [
      {
        name: 'Venue & Ground Permits',
        percentage: 25,
        description: 'Public park/ground hire, community center rental, and civic administration permits.',
      },
      {
        name: 'AV Staging, Sound & Lighting',
        percentage: 22,
        description: 'Public address audio system, stage podium, microphones, and general lighting.',
      },
      {
        name: 'Community Refreshments',
        percentage: 20,
        description: `Packaged refreshments, drinking water, and tea/coffee stalls for ${guestCount} participants.`,
      },
      {
        name: 'Signage & Marketing Materials',
        percentage: 13,
        description: 'Welcome banners, direction signage, schedule boards, and attendee name badges.',
      },
      {
        name: 'Security, First Aid & Sanitation',
        percentage: 12,
        description: 'Volunteer marshals, crowd control barriers, medical first-aid kit, and waste bins.',
      },
      {
        name: 'Contingency Reserve',
        percentage: 8,
        description: 'Buffer for weather contingency, generator backup fuel, and unexpected supplies.',
      },
    ];
  }

  // Exact Integer Arithmetic via Paise (1 INR = 100 Paise)
  const totalPaise = Math.round(budgetInr * 100);
  let allocatedPaiseSum = 0;
  const categories: PlanBudgetItem[] = [];

  for (let i = 0; i < templates.length; i++) {
    const template = templates[i]!;
    const isLast = i === templates.length - 1;

    let catPaise = 0;
    if (isLast) {
      // Allocate remaining paise to the final category (Contingency Reserve)
      catPaise = Math.max(0, totalPaise - allocatedPaiseSum);
    } else {
      catPaise = Math.floor((totalPaise * template.percentage) / 100);
      allocatedPaiseSum += catPaise;
    }

    categories.push({
      category: template.name,
      allocatedInr: catPaise / 100,
      percentage: template.percentage,
      description: template.description,
    });
  }

  return {
    totalBudgetInr: budgetInr,
    currency: 'INR',
    disclaimer:
      'Estimated allocation breakdown for planning guidance only. Actual vendor quotations and seasonal pricing may vary.',
    categories,
  };
}

/**
 * Generates personalized event ideas deterministically, reflecting supplied preferences.
 */
export function generatePersonalizedIdeas(
  eventType: SupportedEventType,
  guestCount: number,
  preferences?: string
): PlanIdea[] {
  const ideas: PlanIdea[] = [];
  const normalizedPref = preferences ? preferences.toLowerCase() : '';

  if (eventType === 'wedding') {
    ideas.push({
      title: 'Warm Welcoming & Guest Experience',
      category: 'Guest Experience',
      description: `Create designated hospitality welcome desks and personalized refreshment hampers for ${guestCount} guests upon arrival.`,
    });

    if (normalizedPref.includes('outdoor') || normalizedPref.includes('lawn') || normalizedPref.includes('garden')) {
      ideas.push({
        title: 'Open-Air Fairy Light Canopy',
        category: 'Atmosphere & Decor',
        description:
          'Incorporate warm ambient fairy-light strings and acoustic perimeter speakers tailored for your requested outdoor venue setting.',
      });
    } else {
      ideas.push({
        title: 'Illuminated Mandap Focal Point',
        category: 'Decor & Theme',
        description:
          'Center the ceremony around an elevated floral mandap with soft ambient backlighting and traditional brass acoustic elements.',
      });
    }

    if (normalizedPref.includes('vegetarian') || normalizedPref.includes('south indian') || normalizedPref.includes('traditional')) {
      ideas.push({
        title: 'Regional Authentic Feast Experience',
        category: 'Catering Concept',
        description:
          'Feature live traditional dining counters highlighting regional delicacies aligned with your stated culinary preferences.',
      });
    } else {
      ideas.push({
        title: 'Multi-Cuisine Interactive Dining Stations',
        category: 'Catering Concept',
        description:
          'Organize varied food stations (chaat counter, hot tandoor, dessert bar) to ensure rapid service for your celebration scale.',
      });
    }

    if (normalizedPref.includes('sangeet') || normalizedPref.includes('music') || normalizedPref.includes('dance')) {
      ideas.push({
        title: 'Curated Choreographed Sangeet Segment',
        category: 'Entertainment',
        description:
          'Incorporate a structured 45-minute family performance sequence followed by high-energy DJ dance sets as requested.',
      });
    }
  } else if (eventType === 'birthday') {
    ideas.push({
      title: 'Coordinated Color Palette & Focal Backdrop',
      category: 'Decor Concept',
      description:
        'Establish an organic balloon arch and personalized photo backdrop centered on the celebratory cake cutting table.',
    });

    if (normalizedPref.includes('game') || normalizedPref.includes('activity') || normalizedPref.includes('kids')) {
      ideas.push({
        title: 'Interactive Entertainment Stations',
        category: 'Entertainment',
        description:
          'Organize engaging group games, a trivia countdown, and mini-tournaments suited for your attendee demographic.',
      });
    } else {
      ideas.push({
        title: 'Celebration Playlist & Emcee Coordination',
        category: 'Entertainment',
        description:
          'Engage an energetic host to guide cake cutting, toast tributes, and lively celebration activities.',
      });
    }

    ideas.push({
      title: 'Signature Custom Cake & Sweet Table',
      category: 'Culinary Highlight',
      description: `Commission a bespoke multi-tier celebration cake sized for ${guestCount} guests alongside themed sweet treats.`,
    });
  } else {
    // Community Event
    ideas.push({
      title: 'Zoned Layout for Smooth Attendee Circulation',
      category: 'Operations & Layout',
      description: `Divide the space into Registration, Main Stage, Breakout Refreshment, and Networking zones to accommodate ${guestCount} attendees.`,
    });

    if (normalizedPref.includes('eco') || normalizedPref.includes('sustainable') || normalizedPref.includes('green')) {
      ideas.push({
        title: 'Zero-Waste & Digital Engagement',
        category: 'Sustainability',
        description:
          'Utilize zero-waste QR-code agendas, reusable cloth signage, and compostable dining ware in line with your environmental preferences.',
      });
    } else {
      ideas.push({
        title: 'Community Interaction & Showcase Hub',
        category: 'Engagement',
        description:
          'Provide display boards and open networking space for community members to share ideas and celebrate collective achievements.',
      });
    }

    ideas.push({
      title: 'Live Audio-Visual Coverage & Streaming',
      category: 'Technology & AV',
      description:
        'Equip the stage with dual handheld microphones, acoustic monitors, and an ambient PA system for clear presentations.',
    });
  }

  // If user supplied custom preferences not already covered by common keywords, add explicit integration idea
  if (
    preferences &&
    preferences.trim().length > 0 &&
    !normalizedPref.includes('outdoor') &&
    !normalizedPref.includes('vegetarian') &&
    !normalizedPref.includes('sangeet') &&
    !normalizedPref.includes('eco')
  ) {
    ideas.push({
      title: 'Special Requirement Accommodation',
      category: 'Custom Preferences',
      description: `Operational coordination for your noted requirements: "${preferences.slice(0, 80)}${preferences.length > 80 ? '...' : ''}". Ensure vendors acknowledge these specifications during contracting.`,
    });
  }

  return ideas;
}

/**
 * Calculates date offset in YYYY-MM-DD format relative to base UTC date.
 */
function offsetDays(isoDate: string, daysOffset: number): string {
  const parts = isoDate.split('-').map((p) => parseInt(p, 10));
  const year = parts[0]!;
  const month = parts[1]! - 1; // 0-indexed month
  const day = parts[2]!;

  const date = new Date(Date.UTC(year, month, day));
  date.setUTCDate(date.getUTCDate() + daysOffset);
  return date.toISOString().slice(0, 10);
}

/**
 * Generates an actionable planning timeline either relative to calendar date or phased milestones.
 */
export function generatePlanningTimeline(
  eventType: SupportedEventType,
  eventDate?: string
): PlanTimeline {
  const hasDate = Boolean(eventDate);
  const phases: PlanTimelinePhase[] = [];

  if (eventType === 'wedding') {
    phases.push({
      phase: 'Phase 1: Foundation & Bookings',
      timeframe: hasDate ? '6 Months Prior' : '6+ Months Before Event',
      targetDate: eventDate ? offsetDays(eventDate, -180) : undefined,
      tasks: [
        'Finalize guest headcount range and lock overall INR budget.',
        'Shortlist and secure primary ceremony and banquet venues.',
        'Book lead wedding photographer and videographer team.',
        'Appoint key bridal party leads and family coordination committee.',
      ],
    });

    phases.push({
      phase: 'Phase 2: Vendor Selection & Design',
      timeframe: hasDate ? '3 Months Prior' : '3-5 Months Before Event',
      targetDate: eventDate ? offsetDays(eventDate, -90) : undefined,
      tasks: [
        'Conduct catering tastings and freeze menu selections.',
        'Select decorator and approve floral & mandap design mockups.',
        'Finalize wedding invitations and schedule postal/digital dispatch.',
        'Book sound, DJ, and ceremonial music artists.',
      ],
    });

    phases.push({
      phase: 'Phase 3: Final Fittings & Logistics',
      timeframe: hasDate ? '1 Month Prior' : '1-2 Months Before Event',
      targetDate: eventDate ? offsetDays(eventDate, -30) : undefined,
      tasks: [
        'Complete final outfit fittings and makeup artist trial sessions.',
        'Consolidate guest RSVP responses and freeze dining headcount.',
        'Draft day-of celebration run-of-show schedule and share with vendors.',
        'Arrange guest transport, hotel room blocks, and welcome gifts.',
      ],
    });

    phases.push({
      phase: 'Phase 4: Final Rehearsals & Briefing',
      timeframe: hasDate ? '1 Week Prior' : '1-2 Weeks Before Event',
      targetDate: eventDate ? offsetDays(eventDate, -7) : undefined,
      tasks: [
        'Conduct final vendor walk-through at venue premises.',
        'Prepare vendor cash settlements and milestone balance payments.',
        'Pack ceremonial items, rings, attire, and emergency kit.',
      ],
    });

    phases.push({
      phase: 'Phase 5: Celebration Day',
      timeframe: hasDate ? 'Event Day' : 'Day of Celebration',
      targetDate: eventDate ? eventDate : undefined,
      tasks: [
        'Venue handover and stage floral decoration inspection.',
        'Catering team arrival and breakfast/lunch readiness check.',
        'Execute ceremonial sequence according to run-of-show schedule.',
        'Celebrate memorable moments with family, friends, and guests.',
      ],
    });
  } else if (eventType === 'birthday') {
    phases.push({
      phase: 'Phase 1: Concept & Venue Lock',
      timeframe: hasDate ? '4 Weeks Prior' : '4-6 Weeks Before Event',
      targetDate: eventDate ? offsetDays(eventDate, -28) : undefined,
      tasks: [
        'Select party theme, budget, and draft guest invitation list.',
        'Reserve party hall, venue lounge, or private dining room.',
        'Order custom theme cake from baker.',
      ],
    });

    phases.push({
      phase: 'Phase 2: Entertainment & Invites',
      timeframe: hasDate ? '2 Weeks Prior' : '2-3 Weeks Before Event',
      targetDate: eventDate ? offsetDays(eventDate, -14) : undefined,
      tasks: [
        'Send digital invitations and track initial RSVPs.',
        'Book entertainer, game emcee, or music playlist.',
        'Order personalized balloons, backdrop, and return gifts.',
      ],
    });

    phases.push({
      phase: 'Phase 3: Final Preparations',
      timeframe: hasDate ? '3 Days Prior' : '3-5 Days Before Event',
      targetDate: eventDate ? offsetDays(eventDate, -3) : undefined,
      tasks: [
        'Confirm final guest headcount with caterer/venue.',
        'Assemble favor bags and verify cake delivery timing.',
        'Prepare party playlist and charge photography gear.',
      ],
    });

    phases.push({
      phase: 'Phase 4: Party Day Execution',
      timeframe: hasDate ? 'Party Day' : 'Day of Party',
      targetDate: eventDate ? eventDate : undefined,
      tasks: [
        'Set up balloon styling, backdrop, and welcome board 2 hours prior.',
        'Receive custom cake and position on celebratory table.',
        'Welcome guests, host games, enjoy cake cutting and food service.',
      ],
    });
  } else {
    // Community Event
    phases.push({
      phase: 'Phase 1: Permits & Community Alignment',
      timeframe: hasDate ? '8 Weeks Prior' : '2-3 Months Before Event',
      targetDate: eventDate ? offsetDays(eventDate, -56) : undefined,
      tasks: [
        'Define event agenda, target attendee capacity, and committee roles.',
        'Apply for municipal ground permits, civic clearance, and electricity access.',
        'Book AV equipment vendor and staging setup.',
      ],
    });

    phases.push({
      phase: 'Phase 2: Public Announcements & Outreach',
      timeframe: hasDate ? '4 Weeks Prior' : '4-6 Weeks Before Event',
      targetDate: eventDate ? offsetDays(eventDate, -28) : undefined,
      tasks: [
        'Launch community registration, posters, and digital announcements.',
        'Recruit and brief event day volunteers and marshals.',
        'Finalize refreshment suppliers and drinking water points.',
      ],
    });

    phases.push({
      phase: 'Phase 3: Safety, Logistics & Dry Run',
      timeframe: hasDate ? '1 Week Prior' : '1-2 Weeks Before Event',
      targetDate: eventDate ? offsetDays(eventDate, -7) : undefined,
      tasks: [
        'Verify stage power, backup generator, and microphone soundcheck.',
        'Place signage, directional arrows, and trash collection stations.',
        'Review emergency safety plan, crowd control, and first-aid kits.',
      ],
    });

    phases.push({
      phase: 'Phase 4: Community Event Day',
      timeframe: hasDate ? 'Event Day' : 'Day of Event',
      targetDate: eventDate ? eventDate : undefined,
      tasks: [
        'Open registration desk and sound check 90 minutes prior to doors.',
        'Direct attendee parking and seating management.',
        'Execute program timeline, speeches, and community activities.',
        'Post-event cleanup and venue handover inspection.',
      ],
    });
  }

  return {
    timelineType: hasDate ? 'date_relative' : 'relative',
    targetDate: eventDate || null,
    phases,
  };
}

/**
 * Generates an actionable vendor checklist tailored to the event category.
 */
export function generateVendorChecklist(
  eventType: SupportedEventType,
  guestCount: number
): VendorChecklistItem[] {
  if (eventType === 'wedding') {
    return [
      {
        id: 'ven-01',
        category: 'Venue & Banquet',
        task: `Finalize venue contract for ${guestCount} guests, including air conditioning, lighting power, and hall timings.`,
        priority: 'high',
        status: 'pending',
      },
      {
        id: 'ven-02',
        category: 'Catering & Hospitality',
        task: 'Confirm live counters, dinner menu, mineral water bottles, and serving staff ratio.',
        priority: 'high',
        status: 'pending',
      },
      {
        id: 'ven-03',
        category: 'Photography',
        task: 'Sign agreement with lead photographer specifying deliverables, teaser deadlines, and raw file rights.',
        priority: 'high',
        status: 'pending',
      },
      {
        id: 'ven-04',
        category: 'Floral & Decor',
        task: 'Approve 3D or sketch design for stage backdrop, entrance walkway, and floral varieties.',
        priority: 'medium',
        status: 'pending',
      },
      {
        id: 'ven-05',
        category: 'Sound & DJ',
        task: 'Provide favorite celebration playlist, ceremony cue songs, and confirm stage sound system.',
        priority: 'medium',
        status: 'pending',
      },
      {
        id: 'ven-06',
        category: 'Beauty & Styling',
        task: 'Schedule bridal and groom makeup artist call-time and vanity room access.',
        priority: 'medium',
        status: 'pending',
      },
      {
        id: 'ven-07',
        category: 'Transport & Logistics',
        task: 'Coordinate airport/station pickups, luggage handling, and guest vehicle parking.',
        priority: 'low',
        status: 'pending',
      },
    ];
  } else if (eventType === 'birthday') {
    return [
      {
        id: 'ven-b01',
        category: 'Party Space',
        task: 'Reserve party venue and confirm decoration access 2 hours prior to start.',
        priority: 'high',
        status: 'pending',
      },
      {
        id: 'ven-b02',
        category: 'Custom Baker',
        task: 'Confirm cake design, flavor, birthday message inscription, and delivery schedule.',
        priority: 'high',
        status: 'pending',
      },
      {
        id: 'ven-b03',
        category: 'Catering / Snacks',
        task: `Arrange finger food, soft beverages, and buffet dinner suited for ${guestCount} guests.`,
        priority: 'high',
        status: 'pending',
      },
      {
        id: 'ven-b04',
        category: 'Decorator',
        task: 'Order theme balloon arch, cutouts, table cloths, and photo backdrop stand.',
        priority: 'medium',
        status: 'pending',
      },
      {
        id: 'ven-b05',
        category: 'Host / Entertainer',
        task: 'Book game coordinator or entertainer and confirm required equipment/props.',
        priority: 'medium',
        status: 'pending',
      },
      {
        id: 'ven-b06',
        category: 'Photographer',
        task: 'Arrange 2-hour event photographer for cake cutting and candid group portraits.',
        priority: 'low',
        status: 'pending',
      },
    ];
  } else {
    // Community Event
    return [
      {
        id: 'ven-c01',
        category: 'Venue & Administration',
        task: 'Secure official venue permission, police clearance, and fire safety compliance.',
        priority: 'high',
        status: 'pending',
      },
      {
        id: 'ven-c02',
        category: 'Audio / Visual Services',
        task: 'Test PA amplifier, wireless microphones, podium acoustics, and stage lighting.',
        priority: 'high',
        status: 'pending',
      },
      {
        id: 'ven-c03',
        category: 'Water & Refreshments',
        task: `Contract water dispenser supplier and snack packets for ${guestCount} participants.`,
        priority: 'medium',
        status: 'pending',
      },
      {
        id: 'ven-c04',
        category: 'Signage & Printing',
        task: 'Produce direction boards, stage flex banner, and participant information brochures.',
        priority: 'medium',
        status: 'pending',
      },
      {
        id: 'ven-c05',
        category: 'Security & Sanitation',
        task: 'Brief volunteer marshals on crowd movement, emergency exits, and clean-up bins.',
        priority: 'high',
        status: 'pending',
      },
      {
        id: 'ven-c06',
        category: 'Emergency First Aid',
        task: 'Coordinate basic medical first-responder kit and ambulance on-call arrangement.',
        priority: 'medium',
        status: 'pending',
      },
    ];
  }
}

/**
 * Main deterministic plan generator orchestrator.
 */
export function generatePlan(
  input: GeneratePlanInput,
  options?: { isFallback?: boolean; fallbackReason?: string }
): PlanOutput {
  const budgetBreakdown = generateBudgetBreakdown(input.eventType, input.guestCount, input.budgetInr);
  const personalizedIdeas = generatePersonalizedIdeas(input.eventType, input.guestCount, input.preferences);
  const planningTimeline = generatePlanningTimeline(input.eventType, input.eventDate);
  const vendorChecklist = generateVendorChecklist(input.eventType, input.guestCount);

  const isFallback = options?.isFallback ?? false;

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
