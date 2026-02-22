# Migration Script — Add user_profiles and user_memories tables
"""
Run this script to create the new per-user memory tables.

Usage:
    python scripts/migrate_add_memory_tables.py

This is idempotent — it uses CREATE TABLE IF NOT EXISTS.
"""

import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import engine, Base
from app.db.models import UserProfile, UserMemory  # noqa: F401 — ensure models are registered


def migrate():
    """Create the new tables if they don't exist."""
    print("🔄 Creating user_profiles and user_memories tables...")

    # Create only the new tables (won't affect existing ones)
    Base.metadata.create_all(
        engine,
        tables=[
            UserProfile.__table__,
            UserMemory.__table__,
        ]
    )

    print("✅ Migration complete!")
    print("   - user_profiles table: ready")
    print("   - user_memories table: ready")
    print()
    print("New features enabled:")
    print("   • Per-user persistent memory (long-term)")
    print("   • User profile with location, language, interests")
    print("   • Memory-augmented RAG pipeline")
    print("   • Google Translate multilingual support")


if __name__ == "__main__":
    migrate()
