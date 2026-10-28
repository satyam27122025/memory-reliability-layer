import pytest


def test_detect_conflict(client):
    """TEST 4: Add different value for the same entity and attribute -> status = conflict."""
    # First assertion
    client.post("/facts", json={
        "entity": "Acme Corporation",
        "attribute": "Delivery date",
        "value": "15 November 2026",
        "sourceType": "customer_email",
        "sourceLabel": "Customer delivery confirmation",
        "sourceReference": "email-demo-001",
    })

    # Second contradictory assertion
    response = client.post("/facts", json={
        "entity": "Acme Corporation",
        "attribute": "Delivery date",
        "value": "20 November 2026",
        "sourceType": "project_record",
        "sourceLabel": "Internal project schedule",
        "sourceReference": "project-demo-001",
    })

    assert response.status_code == 201
    fact = response.json()

    assert fact["status"] == "conflict"
    assert len(fact["assertions"]) == 2
    
    # Conflict detected event must be present in history
    event_types = [h["type"] for h in fact["history"]]
    assert "conflict_detected" in event_types


def test_resolve_conflict(client):
    """TEST 8: Resolve conflict using valid assertion ID."""
    # Create conflicting fact
    client.post("/facts", json={
        "entity": "Nova Retail",
        "attribute": "Contract renewal date",
        "value": "1 December 2026",
        "sourceType": "crm_record",
        "sourceLabel": "CRM",
        "sourceReference": "crm-01",
    })
    res2 = client.post("/facts", json={
        "entity": "Nova Retail",
        "attribute": "Contract renewal date",
        "value": "15 December 2026",
        "sourceType": "manual_entry",
        "sourceLabel": "AM Note",
        "sourceReference": "note-01",
    })
    fact = res2.json()
    assert fact["status"] == "conflict"

    # Select the second assertion
    target_assertion_id = fact["assertions"][1]["id"]

    resolve_payload = {
        "selectedAssertionId": target_assertion_id,
        "resolutionReason": "Confirmed with account manager during renewal review.",
        "resolvedBy": "Priya Sharma",
    }

    resolve_res = client.post(f"/facts/{fact['id']}/resolve", json=resolve_payload)
    assert resolve_res.status_code == 200
    resolved_fact = resolve_res.json()

    assert resolved_fact["status"] == "resolved"
    assert resolved_fact["selectedAssertionId"] == target_assertion_id
    assert resolved_fact["resolutionReason"] == resolve_payload["resolutionReason"]
    assert resolved_fact["resolvedBy"] == "Priya Sharma"
    assert resolved_fact["resolvedAt"] is not None

    # Both assertions must still exist!
    assert len(resolved_fact["assertions"]) == 2

    # Resolved event must be in history
    event_types = [h["type"] for h in resolved_fact["history"]]
    assert "resolved" in event_types


def test_invalid_resolution_foreign_assertion(client):
    """TEST 10: Try to resolve using an assertion from another fact -> HTTP 400."""
    # Create Fact A
    res_a = client.post("/facts", json={
        "entity": "Company A",
        "attribute": "Deadline",
        "value": "1 Jan 2027",
        "sourceType": "internal_document",
        "sourceLabel": "Doc A",
        "sourceReference": "ref-a",
    })
    fact_a = res_a.json()

    # Create Fact B
    res_b = client.post("/facts", json={
        "entity": "Company B",
        "attribute": "Deadline",
        "value": "1 Feb 2027",
        "sourceType": "internal_document",
        "sourceLabel": "Doc B",
        "sourceReference": "ref-b",
    })
    fact_b = res_b.json()

    # Try resolving Fact A using Fact B's assertion ID
    foreign_assertion_id = fact_b["assertions"][0]["id"]
    resolve_res = client.post(f"/facts/{fact_a['id']}/resolve", json={
        "selectedAssertionId": foreign_assertion_id,
        "resolutionReason": "Attempting invalid foreign resolution",
        "resolvedBy": "Tester",
    })
    assert resolve_res.status_code == 400
    assert "does not belong" in resolve_res.json()["detail"].lower()


def test_empty_resolution_reason(client):
    """TEST 11: Empty resolution reason -> HTTP 400, fact remains unresolved."""
    res = client.post("/facts", json={
        "entity": "Vendor X",
        "attribute": "Status",
        "value": "Active",
        "sourceType": "invoice",
        "sourceLabel": "Invoice",
        "sourceReference": "inv-x",
    })
    client.post("/facts", json={
        "entity": "Vendor X",
        "attribute": "Status",
        "value": "Suspended",
        "sourceType": "customer_email",
        "sourceLabel": "Email",
        "sourceReference": "em-x",
    })
    fact = client.get(f"/facts/{res.json()['id']}").json()
    assert fact["status"] == "conflict"

    assertion_id = fact["assertions"][0]["id"]

    resolve_res = client.post(f"/facts/{fact['id']}/resolve", json={
        "selectedAssertionId": assertion_id,
        "resolutionReason": "   ",  # Blank
        "resolvedBy": "Tester",
    })
    assert resolve_res.status_code == 400

    # Verify fact remains in conflict
    fact_check = client.get(f"/facts/{fact['id']}").json()
    assert fact_check["status"] == "conflict"


def test_reopen_after_new_contradiction(client):
    """TEST 12: Resolve a fact, then add a new different value -> status returns to conflict."""
    # 1. Create conflicting fact
    client.post("/facts", json={
        "entity": "Acme Corp",
        "attribute": "Delivery date",
        "value": "15 Nov 2026",
        "sourceType": "customer_email",
        "sourceLabel": "Email",
        "sourceReference": "e-1",
    })
    res2 = client.post("/facts", json={
        "entity": "Acme Corp",
        "attribute": "Delivery date",
        "value": "20 Nov 2026",
        "sourceType": "project_record",
        "sourceLabel": "Schedule",
        "sourceReference": "p-1",
    })
    fact = res2.json()

    # 2. Resolve in favor of 20 Nov 2026
    assert_20 = fact["assertions"][1]["id"]
    client.post(f"/facts/{fact['id']}/resolve", json={
        "selectedAssertionId": assert_20,
        "resolutionReason": "Project schedule authoritative",
        "resolvedBy": "Admin",
    })

    fact_resolved = client.get(f"/facts/{fact['id']}").json()
    assert fact_resolved["status"] == "resolved"

    # 3. Add a third NEW contradictory value
    res3 = client.post("/facts", json={
        "entity": "Acme Corp",
        "attribute": "Delivery date",
        "value": "25 Nov 2026",  # Disagrees with 20 Nov 2026!
        "sourceType": "crm_record",
        "sourceLabel": "CRM Note",
        "sourceReference": "crm-new",
    })
    reopened_fact = res3.json()

    # Fact must be reopened to conflict!
    assert reopened_fact["status"] == "conflict"
    assert reopened_fact["selectedAssertionId"] is None
    assert len(reopened_fact["assertions"]) == 3

    # History must preserve the previous resolved event and have a new conflict_detected event
    event_types = [h["type"] for h in reopened_fact["history"]]
    assert "resolved" in event_types
    assert "conflict_detected" in event_types


def test_stale_assertion_revision_returns_409_without_mutation(client):
    created = client.post("/facts", json={
        "entity": "Revision Co",
        "attribute": "Status",
        "value": "Active",
        "sourceType": "manual_entry",
        "sourceLabel": "Initial",
        "sourceReference": "revision-1",
    })
    fact = created.json()
    assertion_id = fact["assertions"][0]["id"]

    response = client.post(f"/facts/{fact['id']}/resolve", json={
        "selectedAssertionId": assertion_id,
        "assertionVersion": 99,
        "resolutionReason": "Stale request",
        "resolvedBy": "Tester",
    })
    assert response.status_code == 409

    unchanged = client.get(f"/facts/{fact['id']}").json()
    assert unchanged["status"] == "supported"
    assert unchanged["selectedAssertionId"] is None
    assert len(unchanged["history"]) == len(fact["history"])
