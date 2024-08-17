from partners.views.v3.cloud_system.cloud_system_viewset import (
    CloudSystemViewSet,
)
from tools.versioning.routers import VersionedRouter


channel_partners_router = VersionedRouter()
channel_partners_router.register(
    'cloud_systems', CloudSystemViewSet, basename='cloudsystem'
)

router = channel_partners_router
