import os
import tempfile
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from fastapi import FastAPI

from app.database import Base, get_db
from app.routers import facts
from app.services import fact_service
from app.schemas import FactCreate, FactResolveInput


def test_sqlite_persistence_across_sessions():
    """TEST 13: Create data, close database session & engine, reopen fresh connection -> data persists."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as temp_db:
        db_path = temp_db.name

    db_url = f"sqlite:///{db_path}"

    try:
        # Phase 1: Initialize DB, create fact, resolve conflict, close session
        engine1 = create_engine(db_url, connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=engine1)
        Session1 = sessionmaker(autocommit=False, autoflush=False, bind=engine1)
        db1 = Session1()

        # Add initial assertion
        f1_input = FactCreate(
            entity="Reliance Fresh",
            attribute="Vendor contact email",
            value="vendor@reliancefresh.example.com",
            source_type="crm_record",
            source_label="CRM vendor profile",
            source_reference="crm-demo-002",
        )
        fact1 = fact_service.create_or_add_assertion(db1, f1_input)
        fact_id = fact1.id

        # Add conflicting assertion
        f2_input = FactCreate(
            entity="Reliance Fresh",
            attribute="Vendor contact email",
            value="procurement@reliancefresh.example.com",
            source_type="customer_email",
            source_label="Vendor email",
            source_reference="email-demo-002",
        )
        fact_service.create_or_add_assertion(db1, f2_input)

        # Resolve conflict
        resolve_input = FactResolveInput(
            selected_assertion_id=fact1.assertions[1].id,
            resolution_reason="Confirmed with procurement division",
            resolved_by="Priya Sharma",
        )
        fact_service.resolve_fact(db1, fact_id, resolve_input)

        # Close session and dispose engine completely
        db1.close()
        engine1.dispose()

        # Phase 2: Open completely fresh engine and session pointing to the same SQLite file
        engine2 = create_engine(db_url, connect_args={"check_same_thread": False})
        Session2 = sessionmaker(autocommit=False, autoflush=False, bind=engine2)
        db2 = Session2()

        # Re-fetch fact
        loaded_fact = fact_service.get_fact(db2, fact_id)
        assert loaded_fact is not None
        assert loaded_fact.entity == "Reliance Fresh"
        assert loaded_fact.attribute == "Vendor contact email"
        assert loaded_fact.status == "resolved"
        assert len(loaded_fact.assertions) == 2
        assert len(loaded_fact.history) >= 4
        assert loaded_fact.resolution_reason == "Confirmed with procurement division"
        assert loaded_fact.resolved_by == "Priya Sharma"

        fresh_app = FastAPI()
        fresh_app.include_router(facts.router)

        def override_db():
            yield db2

        fresh_app.dependency_overrides[get_db] = override_db
        with TestClient(fresh_app) as fresh_client:
            response = fresh_client.get(f"/facts/{fact_id}")
        assert response.status_code == 200
        assert response.json()["status"] == "resolved"

        db2.close()
        engine2.dispose()
    finally:
        if os.path.exists(db_path):
            try:
                os.remove(db_path)
            except OSError:
                pass
