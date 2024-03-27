from typing import Any

import structlog.contextvars


def get_context_vars() -> dict[str, Any]:
    return structlog.contextvars.get_contextvars()
