
from partners.views.v3.cloud_system.cloud_system_viewset import (
    CloudSystemViewSet,
)
from tools.versioning.routers import VersionedRouter


def get_router():
    channel_partners_router = VersionedRouter()
    channel_partners_router.register(
        'cloud_systems', CloudSystemViewSet, basename='cloudsystem'
    )

    return channel_partners_router
