# Eventra

Eventra is a lightweight, secure, AI-powered Celebration & Event Planner for organizing weddings, birthdays, and community events with personalized ideas, practical INR budgets, actionable planning timelines, and vendor checklists.

This repository is structured as an npm workspace containing decoupled `backend` and `frontend` packages configured with TypeScript strict mode.

---

## Technology Stack

- **Frontend:** React 19, TypeScript, Vite
- **Backend:** Node.js, Express, TypeScript
- **AI Engine:** Google Gemini via the official `@google/genai` SDK (`gemini-2.5-flash`)
- **Database:** PostgreSQL (hosted on Neon)
- **Testing:** Node.js native test runner (`node:test`) with Supertest

---

## Prerequisites

- **Node.js:** v18.0.0 or higher (v24 recommended)
- **npm:** v9.0.0 or higher
- **Google Gemini API Key:** (optional for development; required for live AI generation)

---

## Installation

Clone the repository and install all dependencies from the root directory:

```bash
npm install
```

This installs dependencies across both `backend` and `frontend` workspaces.

---

## Environment Configuration

### Backend

Create a `.env` file in the `backend/` directory by copying the example template:

```bash
cp backend/.env.example backend/.env
```

Available variables in `backend/.env`:

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP server port | `5000` |
| `NODE_ENV` | Application environment (`development`, `production`, `test`) | `development` |
| `CORS_ORIGIN` | Allowed origin for frontend CORS | `http://localhost:5173` |
| `DATABASE_URL` | Neon PostgreSQL connection URI | *(optional)* |
| `GEMINI_API_KEY` | Google Gemini API key (never use `VITE_` prefix) | *(empty)* |
| `GEMINI_MODEL` | Google Gemini model identifier | `gemini-2.5-flash` |
| `GEMINI_TIMEOUT_MS` | Bounded timeout for AI provider requests | `15000` (15 seconds) |
| `GOOGLE_GEMINI_BASE_URL` | Optional custom API endpoint or enterprise proxy | *(unset, defaults to official endpoint)* |

#### Obtaining a Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **Get API key** and create a new key in a Google Cloud project.
4. Paste the key into `backend/.env` as `GEMINI_API_KEY=your_key_here`.
5. Keep credentials on the server only. Never commit keys or expose them to frontend bundles.

#### API Endpoint Configuration & Proxy Notice

The application uses the official `@google/genai` SDK, which communicates directly with Google's production endpoint (`https://generativelanguage.googleapis.com`) by default.
- **Enterprise Proxies / Local Gateways:** If your environment proxies outbound LLM requests, specify `GOOGLE_GEMINI_BASE_URL` in `backend/.env` (e.g. `GOOGLE_GEMINI_BASE_URL=http://your-proxy:8081`). Ensure the proxy server is running and reachable.
- **Direct Official Connection:** If no proxy is required, leave `GOOGLE_GEMINI_BASE_URL` unset. If an environment sets `GOOGLE_GEMINI_BASE_URL` to an inactive port (such as `127.0.0.1:8081`), the application will safely fall back to the deterministic planner with clear attribution.

### Frontend

Create a `.env` file in the `frontend/` directory (optional during development if using Vite's same-origin `/api` proxy):

```bash
cp frontend/.env.example frontend/.env
```

Available variables in `frontend/.env`:

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:5000` |

---

## Running the Application

### Development Mode

Run the backend and frontend in separate terminals:

```bash
# Terminal 1: Start backend on http://localhost:5000
npm run dev:backend

# Terminal 2: Start frontend on http://localhost:5173
npm run dev:frontend
```

Open `http://localhost:5173/` in your browser. The single-page interface immediately presents the planning form and smoothly displays generated deliverables upon submission.

### Type-Checking

Run TypeScript strict checks across both packages:

```bash
npm run typecheck
```

Or individually:

```bash
npm run typecheck:backend
npm run typecheck:frontend
```

### Testing

Run the automated backend test suite (47 comprehensive unit, integration, and security tests):

```bash
npm test
```

> **Note on Testing Isolation:** Automated tests mock the Gemini provider via dependency injection. No live Gemini API calls are made and no credentials are used during automated testing.

### Building for Production

Compile both packages:

```bash
npm run build
```

---

## Planning Engine Architecture

Eventra features a dual-engine architecture designed for reliability, exact financial accuracy, and defense-in-depth:

```
[ User Input via Frontend ]
            │
            ▼
[ Input Validation Boundary ]  ──(Invalid)──▶ HTTP 400 with details
            │ (Valid)
            ▼
┌───────────────────────────────────────────────┐
│              Gemini AI Engine                 │
│  - Official `@google/genai` TypeScript SDK    │
│  - Model: `gemini-2.5-flash`                  │
│  - System Prompt with Injection Defense       │
│  - Structured JSON Output Schema              │
│  - 15-second Bounded Timeout                  │
└───────────────────────────────────────────────┘
            │
            ├──▶ [Success] ──▶ [Exact Budget Reconciliation] ──▶ AI Plan Response
            │
            └──▶ [Failure / Timeout / Auth / Network Error]
                        │
                        ▼
┌───────────────────────────────────────────────┐
│     Deterministic Rule-Based Fallback         │
│  - Heuristic categorization for event type    │
│  - Integer paise exact budget allocation      │
│  - Phased chronological milestone generation  │
│  - Categorized vendor checklist               │
│  - Explicit Engine Tagging: `isFallback: true`│
└───────────────────────────────────────────────┘
                        │
                        ▼
            Fallback Plan Response (Transparently badged)
```

### 1. Exact Budget Reconciliation

Even when generative AI recommends budget allocations, models can introduce floating-point rounding errors or percentage drift. Eventra enforces deterministic reconciliation:
1. Normalizes category percentage allocations.
2. Converts the total budget into integer paise (`budgetInr * 100`).
3. Allocates each category's amount using integer division.
4. Assigns any remainder paise to the final category.
5. **Guarantee:** The sum of all allocated categories always equals `budgetInr` down to the exact rupee and paise (`sum === totalBudgetInr`).

### 2. Prompt Injection Defense

User preferences are treated strictly as untrusted event constraints. Special characters are sanitized and preferences are enclosed as data parameters in prompt construction. The system instruction strictly limits output to the structured JSON schema and forbids instruction overrides or secret disclosure.

### 3. Graceful Rule-Based Fallback

When Gemini is unconfigured (missing `GEMINI_API_KEY`), times out (>15s), encounters rate limits (HTTP 429), authentication errors (HTTP 401/403), network unreachable errors, or outputs invalid JSON, the endpoint automatically routes the validated request to the deterministic planner.

- **Transparent Engine Tagging:** Responses explicitly indicate whether the result came from `ai` (`google-gemini`) or `deterministic` (`rule-based-fallback`) with clear reasoning.
- **Integrity Rule:** A rule-based plan is **never** labeled as AI-generated.

### 4. Estimates & Disclaimers

All financial figures, budget distributions, and vendor suggestions generated by Eventra (both AI and rule-based) are planning estimates based on standard Indian event market ranges. Actual vendor pricing, availability, and contract terms must be confirmed directly with commercial suppliers.

---

## API Endpoints

### 1. Event Plan Generation

- **Route:** `POST /api/plans/generate`
- **Content-Type:** `application/json`
- **Rate Limit:** 30 requests/minute per client IP (in-memory, process-local)

#### Request Parameters

| Field | Type | Required | Description | Constraints |
|---|---|---|---|---|
| `eventType` | string | **Yes** | Celebration category | Must be one of: `wedding`, `birthday`, `community` |
| `guestCount` | integer | **Yes** | Expected attendee count | Positive integer between `1` and `100,000` |
| `budgetInr` | number | **Yes** | Total budget in Indian Rupees (INR) | Positive number between `1` and `100,000,000` (alias `totalBudget` accepted) |
| `eventName` | string | No | Descriptive celebration title | Maximum 120 characters |
| `eventDate` | string | No | Scheduled celebration date | Format `YYYY-MM-DD` (must be a valid calendar date between 2000 and 2100) |
| `eventLocation` | string | No | Geographic city or region | Maximum 120 characters |
| `preferences` | string | No | Specific themes, dietary constraints, or notes | Maximum 1,000 characters (alias `eventPreferences` accepted) |

#### Representative Request

```json
{
  "eventType": "wedding",
  "eventName": "Ananya & Siddharth Palace Wedding",
  "eventDate": "2026-12-18",
  "eventLocation": "Jaipur, Rajasthan",
  "guestCount": 250,
  "budgetInr": 2500000,
  "preferences": "Royal heritage palace theme, Marwari vegetarian feast, Sufi and folk musicians"
}
```

#### Representative Response (HTTP 200 OK — AI Generated)

```json
{
  "success": true,
  "data": {
    "engine": {
      "type": "ai",
      "model": "gemini-2.5-flash",
      "provider": "google-gemini",
      "disclaimer": "This plan was generated by Google Gemini AI with exact budget reconciliation. Cost allocations and vendor suggestions are estimates based on standard Indian celebration market ranges.",
      "fallbackReason": undefined
    },
    "summary": {
      "eventType": "wedding",
      "eventName": "Ananya & Siddharth Palace Wedding",
      "eventDate": "2026-12-18",
      "eventLocation": "Jaipur, Rajasthan",
      "guestCount": 250,
      "budgetInr": 2500000,
      "preferences": "Royal heritage palace theme, Marwari vegetarian feast, Sufi and folk musicians"
    },
    "personalizedIdeas": [
      {
        "id": "ai-idea-01",
        "title": "Royal Shehnai & Nagada Arrival Procession",
        "category": "Guest Experience",
        "description": "Welcome 250 guests with traditional Rajasthani folk musicians, rose water mists, and authentic handcrafted turbans."
      }
    ],
    "budgetBreakdown": {
      "totalBudgetInr": 2500000,
      "currency": "INR",
      "disclaimer": "Estimated allocation breakdown for planning guidance only.",
      "categories": [
        {
          "category": "Catering & Dining",
          "allocatedInr": 875000,
          "percentage": 35.0,
          "description": "Royal Marwari vegetarian banquet, live chaat galli, and sweet counter."
        }
      ]
    },
    "planningTimeline": {
      "timelineType": "date_relative",
      "targetDate": "2026-12-18",
      "phases": [
        {
          "phase": "Phase 1: Heritage Venue & Core Bookings",
          "timeframe": "6 Months Prior",
          "tasks": ["Finalize palace courtyard lease", "Lock traditional catering service"]
        }
      ]
    },
    "vendorChecklist": [
      {
        "id": "ai-ven-01",
        "category": "Venue & Palace",
        "task": "Confirm courtyard illumination permissions and timing curfew.",
        "priority": "high",
        "status": "pending"
      }
    ]
  }
}
```

#### Error Status Codes

- **`400 Bad Request`:** Payload validation error or malformed JSON.
- **`415 Unsupported Media Type`:** Non-JSON `Content-Type`.
- **`429 Too Many Requests`:** Rate limit exceeded (30 req/min). Includes `Retry-After` header.
- **`500 Internal Server Error`:** Sanitized server error. No credentials, tokens, or stack traces are ever exposed.

---

### 2. Health Check Endpoints

- **`GET /api/health`** (or `/health`): Returns HTTP 200 with service status, uptime, and timestamp.
- **`GET /api/health/db`**: Checks live connectivity to PostgreSQL.
  - Returns `200 OK` with `{ status: "ok", database: "connected" }` when connected to Neon.
  - Returns `200 OK` with `{ status: "unavailable", database: "not_configured" }` when `DATABASE_URL` is omitted.
  - Returns `503 Service Unavailable` with `{ status: "error", database: "disconnected" }` if the connection fails.

---

## Security & Reliability Controls

- **Credential Isolation:** `GEMINI_API_KEY` is loaded strictly on the server and is never exposed in browser bundles, responses, logs, or error messages.
- **Prompt Injection Defense:** User inputs (`preferences`, `eventName`, `eventLocation`) are treated as untrusted passive data. All XML/HTML tag markers (`<...>`, `</...>`) and quotation breakouts are stripped before prompt interpolation. Untrusted user preferences are enclosed within strict `<untrusted_user_preferences>` delimiter tags. System instructions explicitly instruct the model to ignore any adversarial override directives, jailbreak instructions, or schema modifications.
- **Model Output Validation:** Model outputs are strictly validated before use. Budget percentages must be finite positive numbers (`Number.isFinite`), preventing `Infinity` or `NaN` arithmetic anomalies. Markdown code fence wrapping (````json ... ````) is stripped before parsing. If validation fails, the engine seamlessly invokes the deterministic rule-based fallback without presenting unverified plans as AI-generated.
- **Timeline Monotonicity:** Phase milestone dates are distributed strictly monotonically (`phase[i].targetDate < phase[i+1].targetDate`), preventing milestone collapse when many phases are generated.
- **Exact Numeric Arithmetic:** Integer paise reconciliation (1 INR = 100 paise) with remainder absorption guarantees that category allocations sum up exactly to the requested budget down to the last paise.
- **Process-Local Rate Limiting & Architectural Limitations:**
  - Rate limiting is enforced via a process-local in-memory store capped at 10,000 entries with automatic expiry cleanup and LRU eviction under heavy IP flooding.
  - Client IP resolution uses Express's validated `req.ip` (which respects `trust proxy` configuration) rather than blindly trusting raw `X-Forwarded-For` headers, preventing header spoofing attacks.
  - **Limitation:** Because counters are process-local in memory, rate limits are not shared across multiple Node.js cluster workers or horizontally scaled container replicas. For multi-replica production environments, a shared distributed store (such as Redis) is required.
- **Helmet Security Headers:** Secures responses with standard headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, CSP).
- **CORS Protection:** Configurable origin restriction (`CORS_ORIGIN`).
- **Payload Limits:** Restricted to 50KB to prevent payload denial-of-service attacks.
- **Bounded AI Timeouts:** Bounded 15-second timeout on AI requests prevents worker thread exhaustion.
- **Strict Scope Boundaries:** No user accounts, database persistence, external tracking, or unnecessary third-party services were introduced.

---

## Production Deployment Prerequisites

Before deploying Eventra to production, complete the following prerequisites:

1. **Active Google Gemini API Key:**
   - Configure a valid API key from [Google AI Studio](https://aistudio.google.com/) as `GEMINI_API_KEY` in the server environment.
   - If `GEMINI_API_KEY` is invalid, expired, or unset, Eventra automatically and safely falls back to deterministic rule-based generation with clear engine attribution.
2. **Reverse Proxy & Trust Proxy Configuration:**
   - When deploying behind a reverse proxy or load balancer (e.g. Nginx, Cloudflare, AWS ALB), enable `trust proxy` in Express (`app.set('trust proxy', 1)`) so that `req.ip` resolves the true client address for rate limiting.
3. **Distributed Rate Limiting (Multi-Instance Scaling):**
   - For horizontal scaling across multiple instances or containers, replace the in-memory rate limiter with a Redis-backed store to synchronize rate limits across nodes.
4. **PostgreSQL Database Connection (Optional):**
   - If live database health monitoring is required, configure `DATABASE_URL` with a valid Neon PostgreSQL connection string. The application functions completely for event planning without database persistence.
5. **CORS Origin Configuration:**
   - Set `CORS_ORIGIN` to the production frontend domain (e.g., `https://eventra.yourdomain.com`).
