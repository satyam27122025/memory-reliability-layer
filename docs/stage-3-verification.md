# Stage 3 Integration Verification

## Result labels

- **PASS** = executed successfully with evidence.
- **FAIL** = executed and failed.
- **NOT RUN** = not executed, with a reason.

## Automated checks

| Check | Result | Evidence |
|---|---|---|
| Backend regression tests after integration | PASS | `python -m pytest .\backend\tests -q`: exit code 0, 24 passed, 2 deprecation warnings. |
| Frontend tests | PASS | `npm test`: exit code 0, 16 passed across 2 files. |
| Production build | PASS | `npm run build`: exit code 0; TypeScript and Vite succeeded. |
| Frontend adapter and component behavior | PASS | Vitest covers API mapping and paths, null conflict answers, HTTP 404/409 and network errors, Dashboard/Facts rendering, ambiguous/conflicting queries, add/resolve failures, empty state, stale-resolution refresh, and keeping the detail dialog mounted during background refresh. |

## Implementation summary

- `src/services/memoryApi.ts` is the centralized HTTP adapter. It reads
  `VITE_API_BASE_URL` (default `http://127.0.0.1:8000`), maps backend
  camelCase fields, preserves exact assertion strings and `answer: null`, and
  raises structured errors containing HTTP status and backend detail.
- API mode is the only mode in the application flow. Fact data is not read
  from or written to localStorage, and the mock reset action is removed.
  `src/data/demoFacts.ts` remains unused sample data.
- Dashboard, Facts Explorer, conflicts, detail, and history load from
  backend endpoints. Requests expose loading/error/retry states; obsolete
  list/detail/query requests are aborted or ignored.
- Successful mutations notify active views to refresh. Resolution submits
  the selected assertion revision. HTTP 409 retains the dialog, fetches the
  latest fact, clears the previous selection, and requires review again.
- Query responses support supported, resolved, conflict, ambiguous, and
  not-found states. Conflict preserves `answer: null` and displays evidence;
  ambiguous results request clarification without selecting an answer.

## Browser checks

The local Vite and FastAPI services used an isolated temporary file-backed
SQLite database, seeded with demo records. The checks were against the running
browser application, not only component mocks.

| Workflow | Result | Evidence |
|---|---|---|
| Dashboard loads backend data | PASS | Browser showed 3 tracked facts and 1 active conflict from the API. |
| Facts Explorer loads live facts | PASS | Browser displayed 3 API facts, including conflict, supported, and resolved records. |
| Detail and history load | PASS | Conflict detail showed both competing assertions, revisions, metadata, and audit history. |
| Resolve a conflict | PASS | Browser resolved the fact; the selected assertion became authoritative and the unselected assertion remained visible. |
| Reopen after contradictory evidence | PASS | Adding contradictory evidence after resolution reopened the fact to Conflict and retained prior assertions/history. |
| Conflict query safety | PASS | Browser displayed competing values and no single current answer. |
| Resolve reopened conflict and persistence | PASS | Browser resolved it, reloaded the page, and verified resolved status, all assertions, and history persisted from SQLite. |
| Ambiguous query | PASS | Browser displayed clarification and no answer selected. |
| Mobile layout at 320px and 375px | PASS | Tested viewport widths with no document horizontal overflow. |
| CORS preflight | PASS | Actual `OPTIONS` request from `http://127.0.0.1:5173` returned HTTP 200 and allowed that origin. |
| Backend unavailable while submitting Add Fact | PASS | Intercepted POST displayed a network error, kept the dialog open, and preserved entered values. |
| Backend unavailable while loading Facts | NOT RUN | Navigation/request interception aborted before the retry check could complete; component tests cover the error and retry UI. |
| Stale-resolution HTTP 409 in browser | NOT RUN | Vitest covers the 409 refresh/reselection flow; manual browser request interception did not produce stable evidence. |
| Empty database browser workflow | NOT RUN | Component test covers the empty state; a live browser check against a newly empty DB was not run. |

## Commands

Run from the repository root in PowerShell:

```powershell
$env:PYTHONPATH = (Resolve-Path ".\backend").Path
& .\backend\.venv\Scripts\python.exe -m pytest .\backend\tests -q
npm test
npm run build
```

For browser integration, the services were started against the temporary DB
`C:\Users\Lenovo\AppData\Local\Temp\stage3-integration.db`, not the development
database:

```powershell
$env:PYTHONPATH = (Resolve-Path ".\backend").Path
$env:DATABASE_URL = "sqlite:///C:/Users/Lenovo/AppData/Local/Temp/stage3-integration.db"
Push-Location .\backend
.\.venv\Scripts\python.exe -m app.seed_demo
Pop-Location
.\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

In another terminal:

```powershell
$env:VITE_API_BASE_URL = "http://127.0.0.1:8000"
npm run dev -- --host 127.0.0.1 --port 5173
```

## Status and remaining checks

The automated checks and core browser workflows passed. Browser checks for
backend-unavailable list retry, stale 409 interception, and a live empty
database remain **NOT RUN**; their relevant UI states have component-test
coverage. Local integration is verified, but production deployment readiness
is not claimed.
