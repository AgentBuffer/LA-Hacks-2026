"""Supabase client helpers for the gateway.

Re-exports from `services.shared.db` so the gateway and agents share one
service-role client. Routes filter explicitly by the JWT's org_id (extracted
by `gateway.auth.get_org_id`) — RLS is defense-in-depth, not the primary guard.
"""

from __future__ import annotations

from services.shared.db import get_supabase

__all__ = ["get_supabase"]
