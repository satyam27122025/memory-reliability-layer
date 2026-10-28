import pytest


def test_query_conflict(client):
    """TEST 5: Query a conflicting fact -> status = conflict, answer = null, competing evidence."""
    client.post("/facts", json={
        "entity": "Acme Corporation",
        "attribute": "Delivery date",
        "value": "15 November 2026",
        "sourceType": "customer_email",
        "sourceLabel": "Customer delivery confirmation",
        "sourceReference": "email-demo-001",
    })
    client.post("/facts", json={
        "entity": "Acme Corporation",
        "attribute": "Delivery date",
        "value": "20 November 2026",
        "sourceType": "project_record",
        "sourceLabel": "Internal project schedule",
        "sourceReference": "project-demo-001",
    })

    # Query the conflicting fact
    res = client.post("/query", json={"query": "What is Acme Corporation's delivery date?"})
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "conflict"
    assert data["answer"] is None
    assert data["entity"] == "Acme Corporation"
    assert data["attribute"] == "Delivery date"
    assert "No single current value can be confirmed" in data["message"]
    assert len(data["evidence"]) == 2

    # Verify both competing assertions are present in evidence
    evidence_values = [e["value"] for e in data["evidence"]]
    assert "15 November 2026" in evidence_values
    assert "20 November 2026" in evidence_values


def test_query_supported(client):
    """TEST 6: Query a supported fact -> status = supported, correct answer returned, evidence included."""
    client.post("/facts", json={
        "entity": "Bharat Logistics",
        "attribute": "Payment status",
        "value": "Paid",
        "sourceType": "invoice",
        "sourceLabel": "Invoice record",
        "sourceReference": "invoice-demo-001",
    })

    res = client.post("/query", json={"query": "Bharat Logistics payment status"})
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "supported"
    assert data["answer"] == "Paid"
    assert data["entity"] == "Bharat Logistics"
    assert data["attribute"] == "Payment status"
    assert len(data["evidence"]) == 1
    assert data["evidence"][0]["sourceType"] == "invoice"


def test_query_resolved(client):
    """TEST 9: Query a resolved fact -> status = resolved, selected value returned, evidence included."""
    # Create conflict
    f_res = client.post("/facts", json={
        "entity": "Nova Retail",
        "attribute": "Renewal date",
        "value": "1 Dec 2026",
        "sourceType": "crm_record",
        "sourceLabel": "CRM",
        "sourceReference": "crm-01",
    })
    f_res2 = client.post("/facts", json={
        "entity": "Nova Retail",
        "attribute": "Renewal date",
        "value": "15 Dec 2026",
        "sourceType": "manual_entry",
        "sourceLabel": "AM Note",
        "sourceReference": "note-01",
    })
    fact = f_res2.json()

    # Resolve in favor of 15 Dec 2026
    target_id = fact["assertions"][1]["id"]
    client.post(f"/facts/{fact['id']}/resolve", json={
        "selectedAssertionId": target_id,
        "resolutionReason": "Confirmed by AM",
        "resolvedBy": "Priya Sharma",
    })

    # Query resolved fact
    res = client.post("/query", json={"query": "Nova Retail renewal date"})
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "resolved"
    assert data["answer"] == "15 Dec 2026"
    assert data["entity"] == "Nova Retail"
    assert len(data["evidence"]) == 2


def test_query_not_found(client):
    """Query unknown entity -> status = not_found, answer = null."""
    res = client.post("/query", json={"query": "Nonexistent Corporation delivery date"})
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "not_found"
    assert data["answer"] is None
    assert "No source-backed fact was found" in data["message"]
    assert len(data["evidence"]) == 0


def test_query_with_equally_relevant_facts_is_ambiguous(client):
    for entity, value in (("Northwind", "Active"), ("Contoso", "Pending")):
        response = client.post("/facts", json={
            "entity": entity,
            "attribute": "Review status",
            "value": value,
            "sourceType": "manual_entry",
            "sourceLabel": entity,
            "sourceReference": f"{entity}-review",
        })
        assert response.status_code == 201

    response = client.post("/query", json={"query": "Review status"})
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "ambiguous"
    assert result["answer"] is None
    assert "Multiple equally relevant facts" in result["message"]
