import uuid
from functools import wraps
from datetime import datetime, timezone
from typing import Callable, List, Optional, ParamSpec, Tuple, TypeVar
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from app.models import Fact, FactAssertion, FactHistory
from app.schemas import FactCreate, FactResolveInput, FactUpdate
from app.services.normalization import normalize_text, normalize_value
from app.services.conflict_service import detect_conflict_status

P = ParamSpec("P")
R = TypeVar("R")


def _rollback_on_error(operation: Callable[P, R]) -> Callable[P, R]:
    @wraps(operation)
    def wrapped(db: Session, *args: P.args, **kwargs: P.kwargs) -> R:
        try:
            return operation(db, *args, **kwargs)
        except Exception:
            db.rollback()
            raise

    return wrapped


def generate_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


def _require_text(value: Optional[str], field_name: str) -> str:
    if value is None:
        raise ValueError(f"{field_name} is required.")
    cleaned = value.strip()
    if not cleaned:
        raise ValueError(f"{field_name} is required.")
    return cleaned


def get_fact(db: Session, fact_id: str) -> Optional[Fact]:
    return db.query(Fact).filter(Fact.id == fact_id).first()


def list_facts(
    db: Session,
    search: Optional[str] = None,
    status: Optional[str] = None,
    source_type: Optional[str] = None,
    sort: Optional[str] = "updated_at",
    order: Optional[str] = "desc",
) -> Tuple[List[Fact], int]:
    query = db.query(Fact)

    # Search filter across entity, attribute, or assertion value
    if search and search.strip():
        s = f"%{search.strip()}%"
        s_norm = f"%{normalize_text(search)}%"
        query = query.filter(
            or_(
                Fact.entity.ilike(s),
                Fact.attribute.ilike(s),
                Fact.normalized_entity.ilike(s_norm),
                Fact.normalized_attribute.ilike(s_norm),
                Fact.assertions.any(FactAssertion.value.ilike(s)),
            )
        )

    # Status filter
    if status and status.strip() and status != "all":
        query = query.filter(Fact.status == status.strip())

    # Source type filter
    if source_type and source_type.strip() and source_type != "all":
        query = query.filter(Fact.assertions.any(FactAssertion.source_type == source_type.strip()))

    total = query.count()

    # Sorting
    sort_column = Fact.updated_at
    if sort == "created_at":
        sort_column = Fact.created_at
    elif sort == "entity":
        sort_column = Fact.normalized_entity

    if order == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))

    facts = query.all()
    return facts, total


@_rollback_on_error
def create_or_add_assertion(db: Session, fact_in: FactCreate) -> Fact:
    entity = _require_text(fact_in.entity, "Entity")
    attribute = _require_text(fact_in.attribute, "Attribute")
    value = fact_in.value
    if value is None or not value.strip():
        raise ValueError("Value is required.")
    source_type = _require_text(fact_in.source_type, "Source type")
    source_label = _require_text(fact_in.source_label, "Source label")
    raw_source_reference = fact_in.source_reference.strip() if fact_in.source_reference is not None else ""
    source_reference = raw_source_reference or f"ref-{uuid.uuid4().hex[:6]}"

    now = datetime.now(timezone.utc)
    norm_entity = normalize_text(entity)
    norm_attr = normalize_text(attribute)

    recorded_at = fact_in.recorded_at or now
    if recorded_at.tzinfo is None:
        recorded_at = recorded_at.replace(tzinfo=timezone.utc)

    # Check for existing fact record with the same normalized pair
    fact = (
        db.query(Fact)
        .filter(
            Fact.normalized_entity == norm_entity,
            Fact.normalized_attribute == norm_attr,
        )
        .first()
    )

    assertion_id = generate_id("assert")

    if not fact:
        # Create brand new fact
        fact_id = generate_id("fact")
        fact = Fact(
            id=fact_id,
            entity=entity,
            normalized_entity=norm_entity,
            attribute=attribute,
            normalized_attribute=norm_attr,
            status="supported",
            created_at=now,
            updated_at=now,
        )
        db.add(fact)
        db.flush()

        assertion = FactAssertion(
            id=assertion_id,
            fact_id=fact.id,
            assertion_version=1,
            value=value,
            source_type=source_type,
            source_label=source_label,
            source_reference=source_reference,
            recorded_at=recorded_at,
            notes=fact_in.notes.strip() if fact_in.notes else None,
            created_at=now,
        )
        db.add(assertion)

        # Append history
        evt_create = FactHistory(
            id=generate_id("evt"),
            fact_id=fact.id,
            event_type="created",
            timestamp=now,
            description=f"Fact created from {source_label}",
            assertion_id=assertion_id,
        )
        evt_added = FactHistory(
            id=generate_id("evt"),
            fact_id=fact.id,
            event_type="assertion_added",
            timestamp=now,
            description=f"Initial assertion recorded: '{value}'",
            assertion_id=assertion_id,
        )
        db.add(evt_create)
        db.add(evt_added)

        db.commit()
        db.refresh(fact)
        return fact

    # Fact already exists: add new immutable assertion
    new_assertion = FactAssertion(
        id=assertion_id,
        fact_id=fact.id,
        assertion_version=len(fact.assertions) + 1,
        value=value,
        source_type=source_type,
        source_label=source_label,
        source_reference=source_reference,
        recorded_at=recorded_at,
        notes=fact_in.notes.strip() if fact_in.notes else None,
        created_at=now,
    )
    db.add(new_assertion)
    db.flush()

    # Reopening rules (Section 8) & conflict evaluation
    if fact.status == "resolved":
        # Check if new assertion matches the resolved assertion value
        selected_assertion = next((a for a in fact.assertions if a.id == fact.selected_assertion_id), None)
        new_val_norm = normalize_value(value)

        if selected_assertion and normalize_value(selected_assertion.value) == new_val_norm:
            # Keeps resolved
            evt_add = FactHistory(
                id=generate_id("evt"),
                fact_id=fact.id,
                event_type="assertion_added",
                timestamp=now,
                description=f"Assertion added matching resolved value from {source_label}",
                assertion_id=assertion_id,
            )
            db.add(evt_add)
        else:
            # REOPEN FACT: New contradictory assertion breaks the previous resolution
            fact.status = "conflict"
            fact.selected_assertion_id = None
            fact.resolution_reason = None
            fact.resolved_by = None
            fact.resolved_at = None

            evt_add = FactHistory(
                id=generate_id("evt"),
                fact_id=fact.id,
                event_type="assertion_added",
                timestamp=now,
                description=f"New assertion added: '{value}' from {source_label}",
                assertion_id=assertion_id,
            )
            evt_conflict = FactHistory(
                id=generate_id("evt"),
                fact_id=fact.id,
                event_type="conflict_detected",
                timestamp=now,
                description=f"Conflict detected: newly added assertion contradicts previously resolved value",
            )
            db.add(evt_add)
            db.add(evt_conflict)
    else:
        # Not resolved: check conflict among all assertions
        all_assertions = list(fact.assertions) + [new_assertion]
        computed_status, unique_vals = detect_conflict_status(all_assertions)

        if computed_status == "conflict" and fact.status != "conflict":
            fact.status = "conflict"
            evt_conflict = FactHistory(
                id=generate_id("evt"),
                fact_id=fact.id,
                event_type="conflict_detected",
                timestamp=now,
                description=f"Conflict detected: values differ across {len(all_assertions)} recorded assertions",
            )
            db.add(evt_conflict)

        evt_add = FactHistory(
            id=generate_id("evt"),
            fact_id=fact.id,
            event_type="assertion_added",
            timestamp=now,
            description=f"New assertion added from {source_label}: '{value}'",
            assertion_id=assertion_id,
        )
        db.add(evt_add)

    fact.updated_at = now
    db.commit()
    db.refresh(fact)
    return fact


@_rollback_on_error
def resolve_fact(db: Session, fact_id: str, resolve_in: FactResolveInput) -> Fact:
    fact = get_fact(db, fact_id)
    if not fact:
        raise ValueError("Fact not found.")

    if not resolve_in.resolution_reason or not resolve_in.resolution_reason.strip():
        raise ValueError("Resolution reason is required.")

    if not resolve_in.resolved_by or not resolve_in.resolved_by.strip():
        raise ValueError("Resolver identifier is required.")

    # Validate assertion belongs to this fact
    assertion = next((a for a in fact.assertions if a.id == resolve_in.selected_assertion_id), None)
    if not assertion:
        raise ValueError("The selected assertion does not belong to this fact.")

    if resolve_in.assertion_version is not None and assertion.assertion_version != resolve_in.assertion_version:
        raise ValueError("This assertion version is stale and has been updated.")

    now = datetime.now(timezone.utc)
    fact.status = "resolved"
    fact.selected_assertion_id = assertion.id
    fact.resolution_reason = resolve_in.resolution_reason.strip()
    fact.resolved_by = resolve_in.resolved_by.strip()
    fact.resolved_at = now
    fact.updated_at = now

    evt_resolve = FactHistory(
        id=generate_id("evt"),
        fact_id=fact.id,
        event_type="resolved",
        timestamp=now,
        description=f"Resolved in favor of assertion {assertion.id} ('{assertion.value}')",
        assertion_id=assertion.id,
        reason=resolve_in.resolution_reason.strip(),
        resolved_by=resolve_in.resolved_by.strip(),
    )
    db.add(evt_resolve)
    db.commit()
    db.refresh(fact)
    return fact


@_rollback_on_error
def update_fact(db: Session, fact_id: str, update_in: FactUpdate) -> Fact:
    """Add a new assertion to an existing fact while preserving all historical data."""
    fact = get_fact(db, fact_id)
    if not fact:
        raise ValueError("Fact not found.")

    if update_in.value is None:
        return fact

    candidate_value = update_in.value
    if not candidate_value.strip():
        raise ValueError("Value is required.")

    if update_in.assertion_id:
        matching_assertion = next((a for a in fact.assertions if a.id == update_in.assertion_id), None)
        if matching_assertion is None:
            raise ValueError("The selected assertion does not belong to this fact.")
        if update_in.assertion_version is not None and matching_assertion.assertion_version != update_in.assertion_version:
            raise ValueError("This assertion version is stale and has been updated.")

        same_value = matching_assertion.value == candidate_value
        same_source_type = update_in.source_type is None or update_in.source_type.strip() == matching_assertion.source_type
        same_source_label = update_in.source_label is None or update_in.source_label.strip() == matching_assertion.source_label
        same_source_reference = update_in.source_reference is None or update_in.source_reference.strip() == matching_assertion.source_reference
        same_notes = update_in.notes is None or update_in.notes == matching_assertion.notes
        same_recorded_at = update_in.recorded_at is None or update_in.recorded_at == matching_assertion.recorded_at

        if (
            same_value
            and same_source_type
            and same_source_label
            and same_source_reference
            and same_notes
            and same_recorded_at
        ):
            return fact

        raise ValueError("This assertion ID conflicts with different content and cannot be updated.")

    fact_create = FactCreate(
        entity=fact.entity,
        attribute=fact.attribute,
        value=candidate_value,
        source_type=update_in.source_type or "manual_entry",
        source_label=update_in.source_label or "Updated record",
        source_reference=update_in.source_reference,
        recorded_at=update_in.recorded_at,
        notes=update_in.notes,
    )
    return create_or_add_assertion(db, fact_create)
