from typing import Optional

from partners.models import AuthToken


def run(key: Optional[str] = None):
    AuthToken.update_internal_token(key=key)
