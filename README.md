# Memory Reliability Layer for Business AI Agents

> **Kernel Status:** Stage 2 of 3 Complete (FastAPI Backend, SQLite Persistence, Conflict Engine, 15 Automated Tests)  
> **Workspace Context:** Demo workspace · Synthetic enterprise data  
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
│   ├── tests/                  # 15 automated pytest cases covering health, conflicts, queries, persistence
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
    ├── services/memoryApi.ts   # Client service abstraction layer ready for Stage 3 FastAPI connection
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
# In root directory
npm run dev
```
Frontend development console: **`http://localhost:5173`**

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

---

## 5. Stage Progress & Roadmap

- [x] **Stage 1 (Frontend Experience):** Responsive developer dashboard, 3D topology visualization, facts explorer, conflict triage, fact detail with lineage history, mock data and service abstraction layer.
- [x] **Stage 2 (Backend & Memory Engine):** FastAPI service, SQLite persistence, immutable assertions, append-only history, deterministic conflict detection, resolution workflow, reopening rules, and 15 automated test cases.
- [ ] **Stage 3 (Integration & Final MVP):** Connect frontend service layer (`memoryApi.ts`) to live FastAPI endpoints, remove mock service from production flow, add loading/empty/error states for network requests, end-to-end user journey testing, demo script preparation.

---

## 6. Official Status Declaration

> *Stage 2 implements the local FastAPI and SQLite memory reliability engine with immutable assertions, history, deterministic conflict detection, explicit resolution, and automated tests. It is not yet integrated with the Stage 1 frontend and is not production-ready.*
