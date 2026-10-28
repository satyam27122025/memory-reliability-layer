# Memory Reliability Layer for Business AI Agents

> **Kernel Status:** Stage 3 Integrated (React frontend connected to FastAPI and SQLite)
> **Workspace Context:** API-backed local workspace
> **Target Audience:** AI Engineers, Platform Leads, Operations & Reliability Teams  

---

## 1. Overview & Problem Statement

Business information naturally fragments and conflicts across disparate operational systems (Customer emails, ERP project schedules, CRM deal trackers, invoices, internal memos). 

A standard business AI agent returning a single confident answer without verifying source agreement poses a significant reliability risk.

The **Memory Reliability Layer** provides:
1. **Source-Backed Assertions:** Stores each business fact tied to an immutable provenance record (`sourceType`, `sourceLabel`, `sourceReference`, `recordedAt`).
2. **Deterministic Conflict Detection:** Detects when distinct sources assert divergent values for the same `(entity, attribute)`.
3. **Refusal to Guess Unresolved Evidence:** Structured query console returns `status: conflict` with both conflicting pieces of evidence rather than hallucinating or guessing.
4. **Explicit Human Reconciliation:** Operators explicitly mark an assertion as authoritative with an audit reason and operator signature.
5. **Full Lineage Preservation:** Original conflicting assertions are preserved forever in the append-only event stream.
6. **Automatic Reopening:** Adding a new contradictory assertion to a previously resolved fact immediately reopens the fact into conflict.

---

## 2. Architecture & Tech Stack

```text
├── backend/
│   ├── app/
│   │   ├── config.py           # Environment and CORS settings
│   │   ├── database.py         # SQLite engine with auto-directory creation and foreign keys
│   │   ├── models.py           # SQLAlchemy tables (facts, fact_assertions, fact_history)
│   │   ├── schemas.py          # Pydantic camelCase response & validation schemas
│   │   ├── services/
│   │   │   ├── normalization.py# Deterministic entity, attribute, and value normalizers
│   │   │   ├── conflict_service.py # Deterministic conflict detection logic
│   │   │   ├── fact_service.py # Fact creation, assertion immutability, resolution & reopening
│   │   │   └── query_service.py# Structured keyword ranking and evidence compilation
│   │   ├── routers/
│   │   │   ├── health.py       # GET /health
│   │   │   ├── facts.py        # GET/POST /facts, GET/PUT /facts/{id}, POST /resolve, GET /history
│   │   │   └── query.py        # POST /query
│   │   ├── main.py             # FastAPI application and lifespan table initialization
│   │   └── seed_demo.py        # Idempotent development seed command
│   ├── tests/                  # 24 automated pytest cases covering health, conflicts, queries, persistence
│   ├── requirements.txt        # Backend dependencies
│   ├── .env.example            # Backend configuration template
│   └── README.md               # Backend-specific documentation
│
└── src/ (Frontend)
    ├── components/
    │   ├── layout/             # AppShell, Developer Charcoal Sidebar, TopBar
    │   ├── dashboard/          # MetricCards, QueryPanel, AttentionList, RecentChanges, 3D MemoryTopology
    │   ├── facts/              # FactsTable, FactCard (mobile), AssertionList, HistoryTimeline, AddFactModal, ResolveConflictModal
    │   └── ui/                 # Button, Badge, Modal, Input, Select, EmptyState, Toast, Skeleton
    ├── pages/                  # OverviewPage, FactsPage, ConflictsPage, FactDetailPage
    ├── services/memoryApi.ts   # Central FastAPI adapter and response mapper
    └── types/facts.ts          # TypeScript types matching FastAPI Pydantic schemas
```

---

## 3. How to Run Both Services

### Terminal 1 — Backend (FastAPI + SQLite)
```powershell
# Set PYTHONPATH to include backend directory
$env:PYTHONPATH = "d:\kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk\backend"

# Start Uvicorn server on http://127.0.0.1:8000
.\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Interactive API documentation: **`http://127.0.0.1:8000/docs`**

### Terminal 2 — Frontend (React + Vite)
```powershell
# Set the backend origin (or copy .env.example to .env.local)
$env:VITE_API_BASE_URL = "http://127.0.0.1:8000"
npm run dev
```
Frontend development console: **`http://localhost:5173`**

### API source-of-truth mode

The frontend uses the API by default. `VITE_API_BASE_URL` is read by the
central adapter in `src/services/memoryApi.ts`; it defaults to
`http://127.0.0.1:8000` and trailing slashes are removed. A failed request is
shown as an error with retry; it never falls back to demo data. The old
mock/localStorage data service and reset action have been removed from the
application flow. `src/data/demoFacts.ts` is retained as unused sample data.

The adapter maps FastAPI camelCase payloads to the frontend model, preserving
assertion text verbatim, API status/detail errors, and `answer: null`.
Successful mutations trigger a shared refresh event so affected pages and
live counters reload. Resolution submits the selected assertion's
`assertionVersion`. On HTTP 409, the dialog remains open, reloads the latest
fact, clears the previous selection, and requires the operator to review the
current assertions again. Conflict queries keep the answer unavailable;
ambiguous queries ask for clarification and never choose a candidate.

To persist the frontend URL, copy `.env.example` to `.env.local` and change
the value as needed. Restart Vite after changing environment variables.

---

## 4. Running Verification Tests

### Backend Automated Test Suite
```powershell
$env:PYTHONPATH = "d:\kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk\backend"
.\backend\.venv\Scripts\python.exe -m pytest backend/tests -v
```

### Frontend Production Build
```powershell
npm run build
```

### Frontend tests
```powershell
npm test
```

---

## 5. Stage Progress & Roadmap

- [x] **Stage 1 (Frontend Experience):** Responsive developer dashboard, 3D topology visualization, facts explorer, conflict triage, fact detail with lineage history, mock data and service abstraction layer.
- [x] **Stage 2 (Backend & Memory Engine):** FastAPI service, SQLite persistence, immutable assertions, append-only history, deterministic conflict detection, resolution workflow, reopening rules, and 15 automated test cases.
- [x] **Stage 3 (Integration):** Connect the frontend to live FastAPI endpoints, remove mock/localStorage behavior from the app flow, add request/loading/error states, and verify core browser workflows against SQLite.

---

## 6. Official Status Declaration

> *The React app uses the FastAPI/SQLite service as its source of truth. See [Stage 3 verification](./docs/stage-3-verification.md) for executed tests and browser evidence. Local development integration is verified; this does not imply production deployment readiness.*
