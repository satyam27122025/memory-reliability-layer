"""Idempotent seed script to populate development SQLite database with demo enterprise facts."""
import sys
from datetime import datetime, timezone
from app.database import SessionLocal, engine, Base
from app.models import Fact, FactAssertion, FactHistory
from app.services.normalization import normalize_text


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    now = datetime.now(timezone.utc)

    try:
        print("Checking existing records...")
        existing_count = db.query(Fact).count()
        if existing_count > 0:
            print(f"Database already contains {existing_count} facts. Skipping seed to ensure idempotency.")
            return

        print("Seeding demo enterprise facts...")

        # Fact 1: Acme Corporation - Delivery date (Conflict)
        f1 = Fact(
            id="fact-001",
            entity="Acme Corporation",
            normalized_entity=normalize_text("Acme Corporation"),
            attribute="Delivery date",
            normalized_attribute=normalize_text("Delivery date"),
            status="conflict",
            created_at=now,
            updated_at=now,
        )
        db.add(f1)
        db.flush()

        a1_1 = FactAssertion(
            id="assert-001a",
            fact_id=f1.id,
            value="15 November 2026",
            source_type="customer_email",
            source_label="Customer delivery confirmation",
            source_reference="email-demo-001",
            recorded_at=now,
            notes="Received from procurement team at Acme",
            created_at=now,
        )
        a1_2 = FactAssertion(
            id="assert-001b",
            fact_id=f1.id,
            value="20 November 2026",
            source_type="project_record",
            source_label="Internal project schedule",
            source_reference="project-demo-001",
            recorded_at=now,
            notes="Updated by project manager during sprint review",
            created_at=now,
        )
        db.add_all([a1_1, a1_2])

        h1_1 = FactHistory(
            id="evt-001a",
            fact_id=f1.id,
            event_type="created",
            timestamp=now,
            description="Fact created from customer email",
            assertion_id="assert-001a",
        )
        h1_2 = FactHistory(
            id="evt-001b",
            fact_id=f1.id,
            event_type="assertion_added",
            timestamp=now,
            description="New assertion added from project record",
            assertion_id="assert-001b",
        )
        h1_3 = FactHistory(
            id="evt-001c",
            fact_id=f1.id,
            event_type="conflict_detected",
            timestamp=now,
            description="Conflict detected: values differ across 2 sources",
        )
        db.add_all([h1_1, h1_2, h1_3])

        # Fact 2: Bharat Logistics - Payment status (Supported)
        f2 = Fact(
            id="fact-002",
            entity="Bharat Logistics",
            normalized_entity=normalize_text("Bharat Logistics"),
            attribute="Payment status",
            normalized_attribute=normalize_text("Payment status"),
            status="supported",
            created_at=now,
            updated_at=now,
        )
        db.add(f2)
        db.flush()

        a2_1 = FactAssertion(
            id="assert-002a",
            fact_id=f2.id,
            value="Paid",
            source_type="invoice",
            source_label="Invoice record",
            source_reference="invoice-demo-001",
            recorded_at=now,
            created_at=now,
        )
        db.add(a2_1)

        h2_1 = FactHistory(
            id="evt-002a",
            fact_id=f2.id,
            event_type="created",
            timestamp=now,
            description="Fact created from invoice record",
            assertion_id="assert-002a",
        )
        db.add(h2_1)

        # Fact 3: Nova Retail - Contract renewal date (Resolved)
        f3 = Fact(
            id="fact-003",
            entity="Nova Retail",
            normalized_entity=normalize_text("Nova Retail"),
            attribute="Contract renewal date",
            normalized_attribute=normalize_text("Contract renewal date"),
            status="resolved",
            selected_assertion_id="assert-003b",
            resolution_reason="Confirmed by the account manager during the renewal review.",
            resolved_by="Priya Sharma",
            resolved_at=now,
            created_at=now,
            updated_at=now,
        )
        db.add(f3)
        db.flush()

        a3_1 = FactAssertion(
            id="assert-003a",
            fact_id=f3.id,
            value="1 December 2026",
            source_type="crm_record",
            source_label="CRM renewal entry",
            source_reference="crm-demo-001",
            recorded_at=now,
            created_at=now,
        )
        a3_2 = FactAssertion(
            id="assert-003b",
            fact_id=f3.id,
            value="15 December 2026",
            source_type="manual_entry",
            source_label="Account manager note",
            source_reference="note-demo-001",
            recorded_at=now,
            notes="Confirmed during renewal review meeting",
            created_at=now,
        )
        db.add_all([a3_1, a3_2])

        h3_1 = FactHistory(
            id="evt-003a",
            fact_id=f3.id,
            event_type="created",
            timestamp=now,
            description="Fact created from CRM record",
            assertion_id="assert-003a",
        )
        h3_2 = FactHistory(
            id="evt-003b",
            fact_id=f3.id,
            event_type="assertion_added",
            timestamp=now,
            description="New assertion added from account manager note",
            assertion_id="assert-003b",
        )
        h3_3 = FactHistory(
            id="evt-003c",
            fact_id=f3.id,
            event_type="conflict_detected",
            timestamp=now,
            description="Conflict detected: CRM record vs account manager note",
        )
        h3_4 = FactHistory(
            id="evt-003d",
            fact_id=f3.id,
            event_type="resolved",
            timestamp=now,
            description="Resolved: 15 December 2026 selected by Priya Sharma",
            reason="Confirmed by the account manager during the renewal review.",
            resolved_by="Priya Sharma",
        )
        db.add_all([h3_1, h3_2, h3_3, h3_4])

        db.commit()
        print("Demo seed complete: inserted 3 facts with assertions and history.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed()

