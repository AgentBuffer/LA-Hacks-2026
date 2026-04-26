# Bureau image — runs Main + 3 helpers + N cognition agents in one process.
# Build context: monorepo root (AgentBuffer-team/).
# Build:  fly deploy --dockerfile services/Dockerfile -a agentbuffer-bureau

FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# Install uv for fast workspace dependency resolution.
RUN pip install --no-cache-dir uv

WORKDIR /app

# Copy workspace manifests first for caching.
COPY pyproject.toml uv.lock ./
COPY gateway/pyproject.toml gateway/pyproject.toml
COPY services ./services

# Install all workspace deps (uses uv.lock for reproducibility).
RUN uv sync --frozen --no-dev

# Sanity bootstrap log on startup.
ENV LOG_LEVEL=INFO

CMD ["uv", "run", "python", "-m", "services.cognition.bureau"]
