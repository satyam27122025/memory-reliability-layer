# Memory Reliability Layer — Backend Service

FastAPI & SQLite reliability engine for business AI agents. Stores source-backed facts, preserves immutable assertions and audit history, enforces deterministic conflict detection, and manages human conflict reconciliation.

---

## 1. Tech Stack & Environment

- **Python:** 3.12+ (CPython 3.12.13 tested)
- **Framework:** FastAPI 0.115+
- **ASGI Server:** Uvicorn
- **ORM / Persistence:** SQLAlchemy 2.0+ with SQLite
- **Validation:** Pydantic 2.9+ (camelCase serialization matching frontend types)
- **Testing:** Pytest 8.3+ & HTTPX / FastAPI TestClient

---

## 2. Setup & Installation

### Virtual Environment (PowerShell)
```powershell
# Create Python 3.12 virtual environment
uv venv backend/.venv --python 3.12
# Or standard Python: python -m venv backend/.venv

# Activate environment
.\backend\.venv\Scripts\Activate.ps1

# Install requirements
pip install -r backend/requirements.txt
# Or using uv: uv pip install -r backend/requirements.txt
```

---

## 3. Running the Server

```powershell
# Set PYTHONPATH to include backend folder and start Uvicorn
$env:PYTHONPATH = "d:\kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk\backend"
.\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Once running:
- **Interactive OpenAPI Documentation:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Alternative ReDoc:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Health Check:** [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

## 4. Running Automated Tests

Run the full 15-test test suite using an isolated SQLite in-memory database:

```powershell
$env:PYTHONPATH = "d:\kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk\backend"
.\backend\.venv\Scripts\python.exe -m pytest backend/tests -v
```

---

## 5. Development Seed Command (Optional)

An idempotent command is provided to seed the local SQLite database with realistic initial synthetic enterprise facts:

```powershell
$env:PYTHONPATH = "d:\kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk\backend"
.\backend\.venv\Scripts\python.exe -m app.seed_demo
```

---

## 6. Core API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Health check (`{"status": "ok"}`) |
| `GET` | `/facts` | List facts with filters (`search`, `status`, `source_type`, `sort`, `order`) |
| `GET` | `/facts/{id}` | Retrieve single fact with all assertions and history |
| `POST`| `/facts` | Create fact or append immutable assertion (triggers conflict detection) |
| `PUT` | `/facts/{id}` | Update fact by appending a new assertion |
| `GET` | `/facts/{id}/history`| Retrieve chronological audit trail for a fact |
| `POST`| `/facts/{id}/resolve`| Declare human authority for a conflict with audit reason |
| `POST`| `/query` | Structured query console returning deterministic answer evidence |

---

## 7. Example cURL Requests

### 1. Create a Fact Assertion
```bash
curl -X POST http://127.0.0.1:8000/facts \
  -H "Content-Type: application/json" \
  -d '{
    "entity": "Acme Corporation",
    "attribute": "Delivery date",
    "value": "15 November 2026",
    "sourceType": "customer_email",
    "sourceLabel": "Customer delivery confirmation",
    "sourceReference": "email-demo-001"
  }'
```

### 2. Add a Contradictory Assertion (Triggers Conflict)
```bash
curl -X POST http://127.0.0.1:8000/facts \
  -H "Content-Type: application/json" \
  -d '{
    "entity": "Acme Corporation",
    "attribute": "Delivery date",
    "value": "20 November 2026",
    "sourceType": "project_record",
    "sourceLabel": "Internal project schedule",
    "sourceReference": "project-demo-001"
  }'
```

### 3. Query the Conflicting Fact
```bash
curl -X POST http://127.0.0.1:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is Acme Corporation delivery date?"}'
```
**Response:**
```json
{
  "status": "conflict",
  "answer": null,
  "entity": "Acme Corporation",
  "attribute": "Delivery date",
  "message": "No single current value can be confirmed.",
  "evidence": [
    {
      "value": "15 November 2026",
      "sourceType": "customer_email",
      "sourceLabel": "Customer delivery confirmation",
      "sourceReference": "email-demo-001"
    },
    {
      "value": "20 November 2026",
      "sourceType": "project_record",
      "sourceLabel": "Internal project schedule",
      "sourceReference": "project-demo-001"
    }
  ]
}
```

### 4. Resolve Conflict
```bash
curl -X POST http://127.0.0.1:8000/facts/fact-001/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "selectedAssertionId": "assert-001b",
    "resolutionReason": "Confirmed with project manager during weekly sprint review.",
    "resolvedBy": "Priya Sharma"
  }'
```

---

## 8. Deterministic Reliability Logic

1. **Conflict Detection:** Normalizes values (trimmed, lowercased). Multiple distinct assertions produce `status: conflict`. No single value is favored automatically based on recency or source type.
2. **Reopening Rule:** If a new assertion is added to an already `resolved` fact:
   - If the new value matches the resolved assertion, it remains `resolved`.
   - If the new value contradicts the resolved assertion, the fact is **reopened** to `status: conflict`, clearing the active resolution and logging a new `conflict_detected` event.
3. **Immutability:** Assertions are never deleted or modified; unselected assertions remain accessible in the database and API responses for audit lineage.

