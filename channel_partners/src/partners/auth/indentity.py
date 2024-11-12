from typing import Any

from nx_jwt.jwt_auth import SAJWTPayload


class NxInternalService:
    """
    Internal service authentication identity class.
    The class is used to bind authenticated identity
    to the request and mimic `Model.id` field to be
    used in caching.
    """
    token_payload: SAJWTPayload
    id: str

    def __init__(self, token_payload: SAJWTPayload):
        self.token_payload = token_payload
        # using token hash as id, it contains sub and scope
        # and can be used to identify the user and permissions
        self.id = token_payload.token_hash()

    def is_request_allowed(self, request: Any) -> bool:
        return self.token_payload.is_request_allowed('channel_partners', request)
