# Stage 2 Verification

## Requirement-to-code/test matrix

`PASS` means executed successfully with evidence. `NOT RUN` means it was not
executed or is intentionally outside this stage; it is not a pass.

| Area | Result | Evidence |
|---|---|---|
| `GET /health` | PASS | Live request returned `{"status":"ok"}`; backend tests also cover it. |
| `/docs` and `/openapi.json` | PASS | Live requests returned HTTP 200; API schema test checks the required paths. |
| Fact create, read, list, and update endpoints | PASS | Backend tests exercise CRUD; live `POST /facts` and `GET /facts/{id}` returned 201 and 200. |
| `GET /facts/{id}/history` | PASS | Backend test verifies returned fact ID and complete history. |
| Conflict detection | PASS | Conflict tests verify conflict state and preserved assertions. |
| Conflict resolution | PASS | Backend test and live `POST /facts/{id}/resolve` verify resolved state. |
| Stale revision resolution returns 409 without mutation | PASS | Test sends a mismatched assertion version and verifies HTTP 409 and unchanged fact/history. |
| Reopening a resolved fact after contradictory evidence | PASS | Test resolves, appends contradictory evidence, and verifies reopened conflict state with historical assertions retained. |
| Deterministic query results | PASS | Query tests cover supported, resolved, conflict, and not-found outcomes. |
| Ambiguous query handling | PASS | Test matches two equally relevant facts and verifies `status=ambiguous` and `answer=null`. |
| Conflict query safety | PASS | Conflict query test verifies `status=conflict` and `answer=null`. |
| Filters and sorting | PASS | Tests verify status/source/search filters and normalized entity ascending sort. |
| PUT idempotency and assertion-ID conflict | PASS | Tests repeat an identical update (one assertion remains), then submit changed content under that ID (HTTP 409, no mutation). |
| Original assertion text preservation | PASS | Test verifies whitespace in a PUT assertion value is preserved exactly. |
| Multi-step mutation rollback | PASS | Injected commit failure followed by query verifies no fact remains; service rolls back and re-raises the error. |
| SQLite foreign-key enforcement | PASS | Test verifies `PRAGMA foreign_keys=1` and that an orphan assertion insert raises `IntegrityError`. |
| File-backed test database isolation | PASS | Each backend test receives a new temporary file-backed SQLite DB via `tmp_path`; no test uses the development DB. |
| Persistence through a fresh app instance | PASS | Persistence test reopens the same temporary DB with a new engine and a fresh FastAPI app, then reads the fact over HTTP. |
| CORS preflight | PASS | Live `OPTIONS /facts` returned 200 and `Access-Control-Allow-Origin: http://localhost:5173`. |
| Idempotent demo seeding | PASS | Test runs seed twice against a temporary file DB and verifies the fact count remains three. |
| Frontend production build | PASS | `npm run build` exited 0 after backend changes. |
| Frontend/backend integration compatibility | NOT RUN | Stage 3 integration is explicitly separate; production build does not prove runtime integration. |

## Commands executed and results

### Backend tests

From the repository root:

```powershell
$py = ".\backend\.venv\Scripts\python.exe"
$env:PYTHONPATH = (Resolve-Path ".\backend").Path
& $py -m pytest .\backend\tests -q
```

Latest result after the Stage 2 tests and ambiguity handling were added:
exit code 0; **24 passed, 0 failed, 2 deprecation warnings** (3.97 seconds).

### Frontend production build

```powershell
npm run build
```

Result: exit code 0; TypeScript build and Vite production build succeeded
(Vite 6.4.5, 9.58 seconds).

### Live HTTP smoke and CORS preflight

The backend was started on port 8002 with
`DATABASE_URL=sqlite:///C:/Users/Lenovo/AppData/Local/Temp/stage2-live-final.db`,
so smoke data was isolated from the development database. The live checks
performed were:

```powershell
$py = ".\backend\.venv\Scripts\python.exe"
$env:PYTHONPATH = (Resolve-Path ".\backend").Path
$env:DATABASE_URL = "sqlite:///C:/Users/Lenovo/AppData/Local/Temp/stage2-live-final.db"
& $py -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8002

Invoke-RestMethod http://127.0.0.1:8002/health
Invoke-WebRequest http://127.0.0.1:8002/docs
Invoke-WebRequest http://127.0.0.1:8002/openapi.json
Invoke-WebRequest -Method Options -Uri http://127.0.0.1:8002/facts `
  -Headers @{Origin="http://localhost:5173"; "Access-Control-Request-Method"="POST"; `
            "Access-Control-Request-Headers"="content-type"}
$fact = Invoke-RestMethod -Method Post -ContentType "application/json" `
  -Uri http://127.0.0.1:8002/facts `
  -Body '{"entity":"Stage2 Live","attribute":"State","value":"Ready","sourceType":"manual_entry","sourceLabel":"Live smoke","sourceReference":"live-stage2"}'
Invoke-RestMethod "http://127.0.0.1:8002/facts/$($fact.id)"
Invoke-RestMethod -Method Post -ContentType "application/json" `
  -Uri http://127.0.0.1:8002/query -Body '{"query":"Stage2 Live State"}'
Invoke-RestMethod -Method Post -ContentType "application/json" `
  -Uri "http://127.0.0.1:8002/facts/$($fact.id)/resolve" `
  -Body ('{"selectedAssertionId":"' + $fact.assertions[0].id + '","resolutionReason":"Live smoke test","resolvedBy":"qa"}')
```

- `GET /health`: `ok`
- `GET /docs`: HTTP 200
- `GET /openapi.json`: HTTP 200
- `OPTIONS /facts` with Origin `http://localhost:5173`: HTTP 200 and matching
  `Access-Control-Allow-Origin`
- `POST /facts`: succeeded; created `fact-74a3a827`
- `GET /facts/{id}`: returned that fact
- `POST /query`: HTTP 200, supported result
- `POST /facts/{id}/resolve`: HTTP 200, resolved result

The live PowerShell smoke command exited 0.

## Remaining scope

Stage 3 frontend/backend runtime integration is not verified here. The
frontend build confirms compilation only. No claim is made that Stage 3 is
complete.
