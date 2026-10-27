# Eventra

Eventra is an AI-powered celebration planner for people organising weddings, birthdays, and community events in India. It turns event type, guest count, budget, date, location, and preferences into practical ideas, an exact INR budget, a timeline, and a vendor checklist.

## Challenge vertical and persona

**Vertical:** Celebration and event planning.
**Persona:** A first-time event organiser who needs a realistic plan without specialist planning knowledge.

## Approach and logic

1. The API validates all user input before it reaches the planning engine.
2. Gemini generates structured recommendations when configured.
3. Eventra validates model output, reconciles every budget allocation to the exact paise, and converts milestones to dates when an event date is supplied.
4. If AI is unavailable, malformed, slow, or unconfigured, a deterministic planner produces a clearly labelled plan instead.

The assistant uses event type, guests, budget, date, location, and preferences as planning context. It never treats user text as instructions. Budget shares are normalized and allocated in integer paise, so the category total always matches the submitted budget exactly.

## Assumptions

- Estimates are planning guidance, not vendor quotes.
- The default experience targets India and uses INR.
- Vendor checklist progress is session-only.
- A Gemini key is optional: the deterministic fallback keeps the app usable without one.

## Stack

- Frontend: React, TypeScript, Vite
- Backend: Express, TypeScript
- AI: Google Gemini through `@google/genai`
- Tests: Node test runner and Supertest

## Run locally

Requirements: Node.js 18+ and npm.

```bash
npm install
copy backend\\.env.example backend\\.env
npm run dev:backend
```

In another terminal:

```bash
npm run dev:frontend
```

Open `http://localhost:5173`. The frontend proxies API calls to the backend at `http://localhost:5000` during development.

Set `GEMINI_API_KEY` in `backend/.env` for Gemini plans. Without it, Eventra returns the deterministic fallback plan.

## Environment

`backend/.env`:

```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GEMINI_TIMEOUT_MS=15000
```

## Commands

```bash
npm test
npm run typecheck
npm run build
```

## API

`POST /api/plans/generate`

```json
{
  "eventType": "wedding",
  "guestCount": 150,
  "budgetInr": 500000,
  "eventDate": "2027-01-15",
  "eventLocation": "Jaipur",
  "preferences": "Vegetarian food and an outdoor evening ceremony"
}
```

Required fields are `eventType`, `guestCount`, and `budgetInr`. Event types are `wedding`, `birthday`, and `community`.

## Safety and reliability

- Server-only API key handling
- Bounded JSON requests and AI timeouts
- Strict input and model-output validation
- Prompt-injection-resistant structured input
- Helmet headers, CORS restriction, and per-IP request limits
- Exact INR budget reconciliation
- Deterministic fallback when Gemini cannot provide a valid plan

## Submission checklist

- Public GitHub repository: `https://github.com/Vishalsomaraju/Eventra`
- One branch: `main`
- No credentials committed (`.env` is ignored)
- Run tests, type checks, and a production build before submitting
