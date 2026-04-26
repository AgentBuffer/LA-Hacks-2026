"""Bureau boot script — registers Main + 3 helpers + N cognition agents.

Runs as one process on Fly. Logs every agent's `agent1q...` address on
first boot so the operator can copy them into Fly secrets.
"""

from __future__ import annotations

import logging
import os
import sys

from uagents import Bureau

from services.cognition.factory import make_cognition_agent
from services.shared.db import list_scheduled_agents

logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
logger = logging.getLogger("cognition.bureau")


def build_bureau() -> Bureau:
    bureau = Bureau()

    # 3 helper uAgents — same instances the team's head-agent uses.
    from services.critic.agent import agent as critic_agent
    from services.publisher.agent import agent as publisher_agent
    from services.strategist.agent import agent as strategist_agent

    bureau.add(strategist_agent)
    bureau.add(critic_agent)
    bureau.add(publisher_agent)

    logger.info("Helper agents registered:")
    logger.info("  Strategist: %s", strategist_agent.address)
    logger.info("  Critic:     %s", critic_agent.address)
    logger.info("  Publisher:  %s", publisher_agent.address)

    # Main agent (chat parser + spawner). Optional — only present if
    # services/main_agent has been built. We import lazily to keep boot
    # graceful while Phase 5 is being built.
    try:
        from services.main_agent.agent import agent as main_agent

        bureau.add(main_agent)
        logger.info("  Main:       %s", main_agent.address)
    except Exception as exc:
        logger.warning("Main agent not registered: %s", exc)

    # Cognition agents — one per scheduled_agents row.
    try:
        rows = list_scheduled_agents()
    except Exception as exc:
        logger.error("Could not load scheduled_agents: %s", exc)
        rows = []

    for row in rows:
        try:
            cog = make_cognition_agent(row)
            bureau.add(cog)
            logger.info(
                "  Cognition[%s/%s]: %s",
                row.get("display_name") or row.get("slug"),
                row.get("cadence"),
                cog.address,
            )
        except Exception as exc:
            logger.error("Failed to build cognition agent %s: %s", row.get("id"), exc)

    return bureau


def main() -> None:
    if "SUPABASE_URL" not in os.environ or "SUPABASE_SERVICE_ROLE_KEY" not in os.environ:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.", file=sys.stderr)
        sys.exit(1)

    bureau = build_bureau()
    bureau.run()


if __name__ == "__main__":
    main()
