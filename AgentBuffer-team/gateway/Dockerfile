# Gateway image — runs the FastAPI gateway only.
# Build context: monorepo root (AgentBuffer-team/).
# Build:  fly deploy --dockerfile gateway/Dockerfile -a agentbuffer-gateway

FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

RUN pip install --no-cache-dir uv

WORKDIR /app

COPY pyproject.toml uv.lock ./
COPY gateway/pyproject.toml gateway/pyproject.toml
COPY services ./services
COPY gateway ./gateway

RUN uv sync --frozen --no-dev

EXPOSE 8080

CMD ["uv", "run", "uvicorn", "gateway.main:app", "--host", "0.0.0.0", "--port", "8080"]
