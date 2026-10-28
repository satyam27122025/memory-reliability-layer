import os
from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# Ensure sqlite directory exists
if settings.DATABASE_URL.startswith("sqlite:///"):
    db_path_str = settings.DATABASE_URL.replace("sqlite:///", "")
    # Handle relative or absolute paths
    db_path = Path(db_path_str)
    if not db_path.is_absolute():
        # Relative to backend working directory
        db_dir = db_path.parent
        db_dir.mkdir(parents=True, exist_ok=True)
    else:
        db_path.parent.mkdir(parents=True, exist_ok=True)

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False,
)

# Enable foreign keys for SQLite
if settings.DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        table_info = cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='fact_assertions'"
        ).fetchone()
        if table_info:
            columns = [row[1] for row in cursor.execute("PRAGMA table_info(fact_assertions)").fetchall()]
            if "assertion_version" not in columns:
                cursor.execute(
                    "ALTER TABLE fact_assertions ADD COLUMN assertion_version INTEGER NOT NULL DEFAULT 1"
                )
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
