from datetime import datetime, timezone
from typing import List, Optional, Literal
from pydantic import BaseModel, ConfigDict, Field, AliasChoices
from pydantic.alias_generators import to_camel

SourceType = Literal[
    "customer_email",
    "project_record",
    "crm_record",
    "invoice",
    "internal_document",
    "manual_entry",
]

FactStatus = Literal["supported", "conflict", "resolved"]


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


# --- Assertions ---
class FactAssertionBase(CamelModel):
    value: str
    source_type: str = Field(
        ...,
        validation_alias=AliasChoices("source_type", "sourceType")
    )
    source_label: str = Field(
        ...,
        validation_alias=AliasChoices("source_label", "sourceLabel")
    )
    source_reference: str = Field(
        ...,
        validation_alias=AliasChoices("source_reference", "sourceReference")
    )
    recorded_at: datetime = Field(
        ...,
        validation_alias=AliasChoices("recorded_at", "recordedAt")
    )
    notes: Optional[str] = None


class FactAssertionCreate(FactAssertionBase):
    pass


class FactAssertionOut(FactAssertionBase):
    id: str
    assertion_version: int = Field(
        1,
        validation_alias=AliasChoices("assertion_version", "assertionVersion")
    )
    created_at: datetime = Field(
        ...,
        validation_alias=AliasChoices("created_at", "createdAt")
    )


# --- History Events ---
class FactHistoryEventOut(CamelModel):
    id: str
    type: str = Field(
        ...,
        validation_alias=AliasChoices("type", "event_type")
    )
    timestamp: datetime
    description: str
    assertion_id: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("assertion_id", "assertionId")
    )
    reason: Optional[str] = None
    resolved_by: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("resolved_by", "resolvedBy")
    )


# --- Fact Creation & Updates ---
class FactCreate(CamelModel):
    entity: str
    attribute: str
    value: str
    source_type: str = Field(
        ...,
        validation_alias=AliasChoices("source_type", "sourceType")
    )
    source_label: str = Field(
        ...,
        validation_alias=AliasChoices("source_label", "sourceLabel")
    )
    source_reference: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("source_reference", "sourceReference")
    )
    recorded_at: Optional[datetime] = Field(
        None,
        validation_alias=AliasChoices("recorded_at", "recordedAt")
    )
    notes: Optional[str] = None


class FactUpdate(CamelModel):
    """Optional update / new assertion payload."""
    assertion_id: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("assertion_id", "assertionId")
    )
    assertion_version: Optional[int] = Field(
        None,
        validation_alias=AliasChoices("assertion_version", "assertionVersion")
    )
    value: Optional[str] = None
    source_type: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("source_type", "sourceType")
    )
    source_label: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("source_label", "sourceLabel")
    )
    source_reference: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("source_reference", "sourceReference")
    )
    recorded_at: Optional[datetime] = Field(
        None,
        validation_alias=AliasChoices("recorded_at", "recordedAt")
    )
    notes: Optional[str] = None


class FactResolveInput(CamelModel):
    selected_assertion_id: str = Field(
        ...,
        validation_alias=AliasChoices("selected_assertion_id", "selectedAssertionId", "assertion_id", "assertionId")
    )
    assertion_version: Optional[int] = Field(
        None,
        validation_alias=AliasChoices("assertion_version", "assertionVersion")
    )
    resolution_reason: str = Field(
        ...,
        validation_alias=AliasChoices("resolution_reason", "resolutionReason", "reason")
    )
    resolved_by: str = Field(
        ...,
        validation_alias=AliasChoices("resolved_by", "resolvedBy")
    )


# --- Fact Output ---
class FactOut(CamelModel):
    id: str
    entity: str
    attribute: str
    status: FactStatus
    assertions: List[FactAssertionOut] = []
    selected_assertion_id: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("selected_assertion_id", "selectedAssertionId")
    )
    resolution_reason: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("resolution_reason", "resolutionReason")
    )
    resolved_by: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("resolved_by", "resolvedBy")
    )
    resolved_at: Optional[datetime] = Field(
        None,
        validation_alias=AliasChoices("resolved_at", "resolvedAt")
    )
    history: List[FactHistoryEventOut] = []
    created_at: datetime = Field(
        ...,
        validation_alias=AliasChoices("created_at", "createdAt")
    )
    updated_at: datetime = Field(
        ...,
        validation_alias=AliasChoices("updated_at", "updatedAt")
    )


class FactListResponse(CamelModel):
    facts: List[FactOut]
    total: int


class HistoryResponse(CamelModel):
    fact_id: str = Field(
        ...,
        validation_alias=AliasChoices("fact_id", "factId")
    )
    history: List[FactHistoryEventOut]


# --- Query ---
class QueryInput(CamelModel):
    query: str


class EvidenceItem(CamelModel):
    value: str
    source_type: str = Field(
        ...,
        validation_alias=AliasChoices("source_type", "sourceType")
    )
    source_label: str = Field(
        ...,
        validation_alias=AliasChoices("source_label", "sourceLabel")
    )
    source_reference: str = Field(
        ...,
        validation_alias=AliasChoices("source_reference", "sourceReference")
    )
    recorded_at: datetime = Field(
        ...,
        validation_alias=AliasChoices("recorded_at", "recordedAt")
    )


class QueryResultOut(CamelModel):
    status: Literal["supported", "conflict", "resolved", "not_found", "ambiguous"]
    answer: Optional[str] = None
    entity: Optional[str] = None
    attribute: Optional[str] = None
    fact_id: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("fact_id", "factId")
    )
    message: Optional[str] = None
    evidence: List[EvidenceItem] = []


class HealthResponse(CamelModel):
    status: str = "ok"
