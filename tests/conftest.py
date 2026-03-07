# Indian Law RAG Chatbot – Test Configuration
"""
Shared fixtures for pytest.

Uses an in-memory SQLite database so tests never touch the real
PostgreSQL instance. The FastAPI test client is pre-configured with
`credentials: 'include'`-style cookie handling.
"""

import os
import pytest
from unittest.mock import patch

# Override env vars BEFORE any app code is imported
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-ci")
os.environ.setdefault("ENCRYPTION_KEY", "0" * 64)
os.environ.setdefault("API_SIGNING_KEY", "test-signing-key")
os.environ.setdefault("APP_ENV", "development")

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, JSON
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import JSONB

# Teach SQLite how to compile PostgreSQL-specific types
@compiles(JSONB, "sqlite")
def _compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"

from app.db.database import Base, get_db
from app.main import app

# ── In-memory SQLite engine ────────────────────────────────────────────────
SQLALCHEMY_TEST_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_TEST_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_test_db():
    """Create all tables before each test, drop after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client():
    """FastAPI TestClient with the test DB override."""
    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def db_session():
    """Raw test DB session for direct queries."""
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()
