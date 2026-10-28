from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Index,
    Text,
)
from sqlalchemy.orm import relationship
from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Fact(Base):
    __tablename__ = "facts"

    id = Column(String(64), primary_key=True, index=True)
    entity = Column(String(255), nullable=False)
    normalized_entity = Column(String(255), nullable=False, index=True)
    attribute = Column(String(255), nullable=False)
    normalized_attribute = Column(String(255), nullable=False, index=True)
    status = Column(String(32), nullable=False, default="supported", index=True)
    
    selected_assertion_id = Column(String(64), nullable=True)
    resolution_reason = Column(Text, nullable=True)
    resolved_by = Column(String(255), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint("normalized_entity", "normalized_attribute", name="uq_fact_entity_attribute"),
        Index("ix_facts_normalized_pair", "normalized_entity", "normalized_attribute"),
    )

    # Relationships
    assertions = relationship(
        "FactAssertion",
        back_populates="fact",
        cascade="all, delete-orphan",
        order_by="FactAssertion.created_at.asc()",
    )
    history = relationship(
        "FactHistory",
        back_populates="fact",
        cascade="all, delete-orphan",
        order_by="FactHistory.timestamp.asc()",
    )


class FactAssertion(Base):
    __tablename__ = "fact_assertions"

    id = Column(String(64), primary_key=True, index=True)
    fact_id = Column(String(64), ForeignKey("facts.id", ondelete="CASCADE"), nullable=False, index=True)
    value = Column(Text, nullable=False)
    source_type = Column(String(64), nullable=False)
    source_label = Column(String(255), nullable=False)
    source_reference = Column(String(255), nullable=False)
    recorded_at = Column(DateTime(timezone=True), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationship
    fact = relationship("Fact", back_populates="assertions")


class FactHistory(Base):
    __tablename__ = "fact_history"

    id = Column(String(64), primary_key=True, index=True)
    fact_id = Column(String(64), ForeignKey("facts.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(64), nullable=False)  # 'created', 'assertion_added', 'conflict_detected', 'resolved'
    timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    description = Column(Text, nullable=False)
    assertion_id = Column(String(64), nullable=True)
    reason = Column(Text, nullable=True)
    resolved_by = Column(String(255), nullable=True)

    # Relationship
    fact = relationship("Fact", back_populates="history")

