# =============================================================================
# LawGPT Backend - Multi-stage Dockerfile
# FastAPI + FAISS + RAG Pipeline
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Builder — install Python dependencies into a virtual env
# ---------------------------------------------------------------------------
FROM python:3.10-slim AS builder

WORKDIR /build

# System deps needed to compile native extensions (faiss-cpu, psycopg2, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for Docker layer caching
COPY requirements.txt .

# Create a virtual env and install all deps into it
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ---------------------------------------------------------------------------
# Stage 2: Production — lean runtime image
# ---------------------------------------------------------------------------
FROM python:3.10-slim AS production

# Runtime-only native libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy the pre-built virtual env from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Create non-root user for security
RUN groupadd -r lawgpt && useradd -r -g lawgpt -d /app -s /sbin/nologin lawgpt

WORKDIR /app

# Copy application code (owned by non-root user from the start)
COPY --chown=lawgpt:lawgpt app/ ./app/
COPY --chown=lawgpt:lawgpt scripts/ ./scripts/
COPY --chown=lawgpt:lawgpt run.py .
COPY --chown=lawgpt:lawgpt requirements.txt .

# Create directories for runtime data
RUN mkdir -p data/faiss_index logs && \
    chown -R lawgpt:lawgpt /app

# Switch to non-root user
USER lawgpt

# Expose API port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
    CMD curl -f http://localhost:8000/health/live || exit 1

# Run with uvicorn (production settings)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--log-level", "info"]
