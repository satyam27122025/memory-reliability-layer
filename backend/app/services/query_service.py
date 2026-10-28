from typing import Optional, List
from sqlalchemy.orm import Session
from app.models import Fact
from app.schemas import QueryResultOut, EvidenceItem
from app.services.normalization import normalize_text


def query_facts(db: Session, query_str: str) -> QueryResultOut:
    if not query_str or not query_str.strip():
        return QueryResultOut(
            status="not_found",
            answer=None,
            message="No source-backed fact was found for this query.",
            evidence=[],
        )

    q = normalize_text(query_str)
    all_facts = db.query(Fact).all()

    best_fact: Optional[Fact] = None
    best_score = 0
    has_tied_best_fact = False

    for fact in all_facts:
        score = 0
        norm_entity = fact.normalized_entity
        norm_attr = fact.normalized_attribute

        entity_in_q = norm_entity in q or q in norm_entity
        attr_in_q = norm_attr in q or q in norm_attr

        if norm_entity in q and norm_attr in q:
            score = 100
        elif entity_in_q and attr_in_q:
            score = 80
        elif norm_entity in q or q in norm_entity:
            score = 50
        elif norm_attr in q or q in norm_attr:
            score = 30
        else:
            for a in fact.assertions:
                if a.value and (normalize_text(a.value) in q or q in normalize_text(a.value)):
                    score = max(score, 20)

        if score > best_score:
            best_score = score
            best_fact = fact
            has_tied_best_fact = False
        elif score == best_score and score >= 20 and best_fact is not None:
            has_tied_best_fact = True

    if not best_fact or best_score < 20:
        return QueryResultOut(
            status="not_found",
            answer=None,
            message="No source-backed fact was found for this query.",
            evidence=[],
        )

    if has_tied_best_fact:
        return QueryResultOut(
            status="ambiguous",
            answer=None,
            message="Multiple equally relevant facts matched this query. Include more entity or attribute detail.",
            evidence=[],
        )

    # Format evidence from all recorded assertions
    evidence_items = [
        EvidenceItem(
            value=a.value,
            source_type=a.source_type,
            source_label=a.source_label,
            source_reference=a.source_reference,
            recorded_at=a.recorded_at,
        )
        for a in best_fact.assertions
    ]

    # Handle Conflict state
    if best_fact.status == "conflict":
        return QueryResultOut(
            status="conflict",
            answer=None,
            entity=best_fact.entity,
            attribute=best_fact.attribute,
            fact_id=best_fact.id,
            message="No single current value can be confirmed.",
            evidence=evidence_items,
        )

    # Handle Resolved state
    if best_fact.status == "resolved":
        selected = next((a for a in best_fact.assertions if a.id == best_fact.selected_assertion_id), None)
        selected_val = selected.value if selected else (best_fact.assertions[0].value if best_fact.assertions else "")
        return QueryResultOut(
            status="resolved",
            answer=selected_val,
            entity=best_fact.entity,
            attribute=best_fact.attribute,
            fact_id=best_fact.id,
            evidence=evidence_items,
        )

    # Handle Supported state
    supported_val = best_fact.assertions[0].value if best_fact.assertions else ""
    return QueryResultOut(
        status="supported",
        answer=supported_val,
        entity=best_fact.entity,
        attribute=best_fact.attribute,
        fact_id=best_fact.id,
        evidence=evidence_items,
    )
