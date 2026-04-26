# AgentBuffer

## Run after cloning

### Frontend (Next.js)

```bash
cd web
cp .env.local.example .env.local   # fill in Supabase keys
npm install
npm run dev
```

Open http://localhost:3000.

### Backend (FastAPI gateway + uAgents)

```bash
cd AgentBuffer-team
cp .env.example .env               # fill in keys
uv sync
```

Run the gateway:

```bash
uv run uvicorn gateway.main:app --reload --port 8000
```

Run the agent bureau (Strategist + Critic + Publisher + cognition agents):

```bash
uv run python -m services.cognition.bureau
```

## Requirements

- Node 20+, npm
- Python 3.12, [uv](https://docs.astral.sh/uv/)
