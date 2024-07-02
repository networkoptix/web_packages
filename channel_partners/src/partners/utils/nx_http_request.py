from rest_framework.request import Request

from partners.authentication import IntrospectionResult
from partners.models import (
    CloudHost,
    CloudSystemId,
    CloudUser,
)


class NxRequest(Request):
    def __init__(self):
        super().__init__()
        self.cloud_host: CloudHost = None
        self.system_introspection: IntrospectionResult = None
        self.cloud_system: CloudSystemId = None
        self.user: CloudUser = None
