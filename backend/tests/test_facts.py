import pytest
from datetime import datetime, timezone


def test_health_check(client):
    """TEST 1: GET /health returns status ok."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_create_supported_fact(client):
    """TEST 2: Create one assertion -> status = supported, history contains created event."""
    payload = {
        "entity": "Bharat Logistics",
        "attribute": "Payment status",
        "value": "Paid",
        "sourceType": "invoice",
        "sourceLabel": "Invoice record",
        "sourceReference": "inv-001",
        "notes": "Verified receipt",
    }
    response = client.post("/facts", json=payload)
    assert response.status_code == 201
    fact = response.json()
    
    assert fact["entity"] == "Bharat Logistics"
    assert fact["attribute"] == "Payment status"
    assert fact["status"] == "supported"
    assert len(fact["assertions"]) == 1
    assert fact["assertions"][0]["value"] == "Paid"
    assert fact["assertions"][0]["sourceType"] == "invoice"
    
    # Check history events
    assert len(fact["history"]) == 2
    event_types = [h["type"] for h in fact["history"]]
    assert "created" in event_types
    assert "assertion_added" in event_types


def test_add_same_value_assertion(client):
    """TEST 3: Add second assertion with the same logical value -> remains supported, preserves both."""
    payload1 = {
        "entity": "Bharat Logistics",
        "attribute": "Payment status",
        "value": "Paid",
        "sourceType": "invoice",
        "sourceLabel": "Invoice record 1",
        "sourceReference": "inv-001",
    }
    client.post("/facts", json=payload1)

    # Second assertion with different casing/spacing
    payload2 = {
        "entity": "bharat logistics",
        "attribute": "payment status",
        "value": " paid ",
        "sourceType": "crm_record",
        "sourceLabel": "CRM note",
        "sourceReference": "crm-001",
    }
    response = client.post("/facts", json=payload2)
    assert response.status_code == 201
    fact = response.json()

    assert fact["status"] == "supported"
    assert len(fact["assertions"]) == 2
    # Check both assertions exist and preserve original text
    values = [a["value"] for a in fact["assertions"]]
    assert "Paid" in values
    assert " paid " in values


def test_preserve_history_and_assertions(client):
    """TEST 7: Add multiple assertions -> no assertion deleted, history remains ordered."""
    client.post("/facts", json={
        "entity": "Tata Digital",
        "attribute": "Project budget",
        "value": "₹45,00,000",
        "sourceType": "internal_document",
        "sourceLabel": "Draft budget",
        "sourceReference": "doc-01",
    })

    client.post("/facts", json={
        "entity": "Tata Digital",
        "attribute": "Project budget",
        "value": "₹45,00,000",
        "sourceType": "invoice",
        "sourceLabel": "Signed quote",
        "sourceReference": "inv-99",
    })

    res = client.get("/facts")
    assert res.status_code == 200
    facts = res.json()["facts"]
    tata = next(f for f in facts if f["entity"] == "Tata Digital")
    
    assert len(tata["assertions"]) == 2
    assert len(tata["history"]) >= 2
    
    # Check GET /facts/{id}/history endpoint
    hist_res = client.get(f"/facts/{tata['id']}/history")
    assert hist_res.status_code == 200
    hist_data = hist_res.json()
    assert hist_data["factId"] == tata["id"]
    assert len(hist_data["history"]) == len(tata["history"])


def test_list_filters(client):
    """TEST 14: Filter facts by status, entity/attribute search, and source type."""
    # Seed 3 distinct facts
    client.post("/facts", json={
        "entity": "Acme Corporation",
        "attribute": "Delivery date",
        "value": "15 Nov 2026",
        "sourceType": "customer_email",
        "sourceLabel": "Email 1",
        "sourceReference": "e-1",
    })
    client.post("/facts", json={
        "entity": "Acme Corporation",
        "attribute": "Delivery date",
        "value": "20 Nov 2026",
        "sourceType": "project_record",
        "sourceLabel": "Schedule 2",
        "sourceReference": "p-1",
    })
    client.post("/facts", json={
        "entity": "Bharat Logistics",
        "attribute": "Payment status",
        "value": "Paid",
        "sourceType": "invoice",
        "sourceLabel": "Invoice record",
        "sourceReference": "inv-01",
    })

    # Filter by status=conflict
    res_conflict = client.get("/facts?status=conflict")
    assert res_conflict.status_code == 200
    data_conflict = res_conflict.json()
    assert data_conflict["total"] == 1
    assert data_conflict["facts"][0]["entity"] == "Acme Corporation"

    # Filter by source_type=invoice
    res_source = client.get("/facts?source_type=invoice")
    assert res_source.status_code == 200
    assert res_source.json()["total"] == 1
    assert res_source.json()["facts"][0]["entity"] == "Bharat Logistics"

    # Search by keyword
    res_search = client.get("/facts?search=Acme")
    assert res_search.status_code == 200
    assert res_search.json()["total"] == 1


def test_api_schema(client):
    """TEST 15: Verify that /docs and /openapi.json load successfully."""
    docs_res = client.get("/docs")
    assert docs_res.status_code == 200

    openapi_res = client.get("/openapi.json")
    assert openapi_res.status_code == 200
    schema = openapi_res.json()
    assert "paths" in schema
    assert "/facts" in schema["paths"]
    assert "/query" in schema["paths"]
    assert "/health" in schema["paths"]

