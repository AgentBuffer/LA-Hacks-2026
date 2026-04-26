"""Parse human cadence strings ('weekly', 'every 3 days', 'daily') to seconds."""

from __future__ import annotations

import re

_DEFAULT = 3600

_SIMPLE = {
    "minute": 60,
    "minutely": 60,
    "hour": 3600,
    "hourly": 3600,
    "day": 86400,
    "daily": 86400,
    "weekday": 86400,
    "week": 604800,
    "weekly": 604800,
    "month": 2592000,
    "monthly": 2592000,
}


def parse_cadence(cadence: str | None) -> int:
    """Convert a cadence string to interval seconds.

    Examples:
        weekly        -> 604800
        daily         -> 86400
        "every 3 days" -> 259200
        "12h"         -> 43200
        unknown/blank -> 3600
    """
    if not cadence:
        return _DEFAULT
    s = cadence.strip().lower()

    if s in _SIMPLE:
        return _SIMPLE[s]

    # "every N <unit>"
    m = re.match(r"every\s+(\d+)\s*(minute|hour|day|week|month)s?", s)
    if m:
        n = int(m.group(1))
        unit = m.group(2)
        return n * _SIMPLE[unit]

    # "Nm/h/d/w" shorthand
    m = re.match(r"(\d+)\s*([mhdw])$", s)
    if m:
        n = int(m.group(1))
        return n * {"m": 60, "h": 3600, "d": 86400, "w": 604800}[m.group(2)]

    # bare number → seconds
    if s.isdigit():
        return int(s)

    return _DEFAULT
