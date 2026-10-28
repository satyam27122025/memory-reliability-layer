from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import QueryInput, QueryResultOut
from app.services import query_service

router = APIRouter(tags=["Query"])


@router.post("/query", response_model=QueryResultOut)
def query_facts(
    query_in: QueryInput,
    db: Session = Depends(get_db),
):
    """Query business facts using deterministic matching and conflict verification."""
    return query_service.query_facts(db=db, query_str=query_in.query)

