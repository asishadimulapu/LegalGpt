# NyayaSahay Backend - Dockerfile for Fly.io
# Python 3.11 with slim base for smaller image

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for Docker layer caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the sentence-transformers model during build
# This prevents cold start delays!
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

# Copy application code
COPY . .

# Create non-root user for security
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8080

# Start command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
