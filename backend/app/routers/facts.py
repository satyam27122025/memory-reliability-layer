from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import (
    FactOut,
    FactListResponse,
    FactCreate,
    FactUpdate,
    FactResolveInput,
    HistoryResponse,
)
from app.services import fact_service

router = APIRouter(prefix="/facts", tags=["Facts"])


@router.get("", response_model=FactListResponse)
def list_facts(
    search: Optional[str] = Query(None, description="Search term across entities, attributes, and asserted values"),
    status: Optional[str] = Query(None, description="Filter by status (supported, conflict, resolved)"),
    source_type: Optional[str] = Query(None, description="Filter by assertion source type"),
    sort: Optional[str] = Query("updated_at", description="Field to sort by"),
    order: Optional[str] = Query("desc", description="Sort order (asc, desc)"),
    db: Session = Depends(get_db),
):
    """List business facts with flexible filtering, searching, and sorting."""
    facts, total = fact_service.list_facts(
        db=db,
        search=search,
        status=status,
        source_type=source_type,
        sort=sort,
        order=order,
    )
    return FactListResponse(facts=facts, total=total)


@router.get("/{fact_id}", response_model=FactOut)
def get_fact(
    fact_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve a single fact with all its historical assertions and event timeline."""
    fact = fact_service.get_fact(db=db, fact_id=fact_id)
    if not fact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fact not found.",
        )
    return fact


@router.post("", response_model=FactOut, status_code=status.HTTP_201_CREATED)
def create_fact(
    fact_in: FactCreate,
    db: Session = Depends(get_db),
):
    """Create a new fact assertion or append an immutable assertion to an existing fact."""
    try:
        fact = fact_service.create_or_add_assertion(db=db, fact_in=fact_in)
        return fact
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{fact_id}", response_model=FactOut)
def update_fact(
    fact_id: str,
    update_in: FactUpdate,
    db: Session = Depends(get_db),
):
    """Append a new assertion to an existing fact while preserving all historical data."""
    try:
        fact = fact_service.update_fact(db=db, fact_id=fact_id, update_in=update_in)
        return fact
    except ValueError as e:
        err_msg = str(e)
        if "not found" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err_msg)
        if "does not belong" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)
        if "stale" in err_msg.lower() or "conflict" in err_msg.lower() or "version" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=err_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)


@router.get("/{fact_id}/history", response_model=HistoryResponse)
def get_fact_history(
    fact_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve the full chronological audit trail for a fact."""
    fact = fact_service.get_fact(db=db, fact_id=fact_id)
    if not fact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fact not found.",
        )
    return HistoryResponse(fact_id=fact.id, history=fact.history)


@router.post("/{fact_id}/resolve", response_model=FactOut)
def resolve_conflict(
    fact_id: str,
    resolve_in: FactResolveInput,
    db: Session = Depends(get_db),
):
    """Explicitly declare an authoritative assertion for a conflicted fact."""
    try:
        fact = fact_service.resolve_fact(db=db, fact_id=fact_id, resolve_in=resolve_in)
        return fact
    except ValueError as e:
        err_msg = str(e)
        if "not found" in err_msg.lower() and "fact" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err_msg)
        if "does not belong" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)
        if "stale" in err_msg.lower() or "conflict" in err_msg.lower() or "version" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=err_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)

