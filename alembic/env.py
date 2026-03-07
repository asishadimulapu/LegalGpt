"""
Alembic Environment Configuration for Indian Law RAG Chatbot.

Reads the database URL from app.config.settings so we have a single
source of truth (the DATABASE_URL env var / .env file).
"""

from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Import app models so Alembic can detect them for autogenerate
from app.db.database import Base  # noqa: F401
import app.db.models  # noqa: F401  — registers all models on Base.metadata
from app.config import settings

# Alembic Config object
config = context.config

# Override sqlalchemy.url from application settings.
# .replace("%", "%%") escapes percent signs (e.g. %40 in passwords)
# that would otherwise break configparser's interpolation.
config.set_main_option(
    "sqlalchemy.url",
    settings.database_url.replace("%", "%%"),
)

# Python logging from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# MetaData for autogenerate support
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (emit SQL to stdout)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (connect to the database)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
