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

One-time setup:

```bash
cd AgentBuffer-team
cp .env.example .env                       # fill in keys
python3 -m uv sync --all-packages          # installs root + workspace members
```

Run the gateway (terminal 2):

```bash
cd "AgentBuffer-team"
set -a && source .env && set +a
python3 -m uv run uvicorn gateway.main:app --reload --port 8000
```

Run the agent bureau (terminal 3 — Strategist + Critic + Publisher + cognition agents):

```bash
cd "AgentBuffer-team"
set -a && source .env && set +a
python3 -m uv run python -m services.cognition.bureau
```

## Requirements

- Node 20+, npm
- Python 3.12, [uv](https://docs.astral.sh/uv/) (invoked as `python3 -m uv` if not on PATH)

### Notes

- `uv sync` alone removes workspace-member deps (e.g. `fastapi`). Always use `--all-packages`.
- `python3 -m uv run` does not auto-load `.env` — source it first with `set -a && source .env && set +a`.
- If you want bare `uv` instead of `python3 -m uv`, add it to PATH:
  ```bash
  echo 'export PATH="$HOME/Library/Python/3.9/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
  ```
