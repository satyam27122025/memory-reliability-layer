from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.routers import health, facts, query


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Automatically create tables for local development
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Memory Reliability Layer API",
    description="High-assurance deterministic memory and conflict resolution engine for business AI agents.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router)
app.include_router(facts.router)
app.include_router(query.router)


@app.get("/", tags=["Root"])
def root():
    return {
        "service": "Memory Reliability Layer",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health",
    }

