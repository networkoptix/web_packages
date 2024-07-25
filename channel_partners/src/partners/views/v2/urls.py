from django.urls import (
    converters,
    include,
    path,
)

from partners.views.v2.usage_reports_views import (
    ChannelPartnerServiceReportsViewSet,
    OrganizationServiceReportsViewSet,
)
from partners.views.v2.views import (
    ChannelPartnerAvailableServiceViewSet,
    ChannelPartnerExternalIdViewSet,
    ChannelPartnerNestedViewSet,
    ChannelPartnerOwnedServiceViewSet,
    ChannelPartnerServiceExternalIdViewSet,
    ChannelPartnerUserViewSet,
    ChannelPartnerViewSet,
    ChannelStructureViewSet,
    CloudSystemExternalIdViewSet,
    CloudSystemNestedViewSet,
    CloudSystemViewSet,
    OrganizationNesetedViewSet,
    OrganizationrExternalIdViewSet,
    OrganizationServiceViewSet,
    OrganizationUserViewSet,
    OrganizationViewSet,
    SystemGroupUserViewSet,
    SystemGroupViewSet,
    all_org_users,
    all_services,
    channel_partner_roles,
    cloud_storage_usage_report,
    organization_roles,
    partner_events,
    system_user,
    system_users,
    user_systems,
)
from tools.versioning.routers import VersionedRouter


channel_partner_urls = [
    path('channel_partner_roles', channel_partner_roles, name='channel_partner_roles'),
    path('organization_roles', organization_roles, name='organization_roles'),
    path('events', partner_events, name='events'),
    path('services', all_services, name='services')
]

channel_partner_internal_urls = [
    path('events', partner_events, name='events'),
    path('services', all_services, name='services'),
    path('systems/<uuid:system_id>/users/', system_users, name='system_users'),
    path('systems/<uuid:system_id>/users/<str:email>/', system_user, name='system_user'),
    path('users/<str:email>/systems/', user_systems, name='user_systems'),
    path('users/all', all_org_users, name='all_org_users'),
    path('users/cloud_storage_usage_report', cloud_storage_usage_report, name='cloud_storage_usage_report'),
]

urlpatterns = channel_partner_urls
urlpatterns.append(path('internal/', include(channel_partner_internal_urls)))


channel_partners_router = VersionedRouter()
channel_partners_router.register(rf'^channel_partners/(?P<channel_partner_id>{converters.UUIDConverter.regex})/external_ids', ChannelPartnerExternalIdViewSet, basename='channelpartner-externalid')
channel_partners_router.register(rf'^organizations/(?P<channel_partner_id>{converters.UUIDConverter.regex})/external_ids', OrganizationrExternalIdViewSet, basename='organization-externalid')
channel_partners_router.register(rf'^services/(?P<channel_partner_id>{converters.UUIDConverter.regex})/external_ids', ChannelPartnerServiceExternalIdViewSet, basename='channelpartnerservice-externalid')
channel_partners_router.register(rf'^cloud_systems/(?P<channel_partner_id>{converters.UUIDConverter.regex})/external_ids', CloudSystemExternalIdViewSet, basename='cloudsystem-externalid')
channel_partners_router.register('channel_partners', ChannelStructureViewSet, basename='subchannels')

channel_partners_routes = channel_partners_router.register('channel_partners', ChannelPartnerViewSet, basename='channelpartner')
channel_partners_routes.register('users', ChannelPartnerUserViewSet, basename='channelpartners-user', parents_query_lookups=['channel_partner'])
channel_partners_routes.register('services/owned', ChannelPartnerOwnedServiceViewSet, basename='channelpartners-owned-service', parents_query_lookups=['created_by_channel_partner'])
channel_partners_routes.register('services/available', ChannelPartnerAvailableServiceViewSet, basename='channelpartners-available-service', parents_query_lookups=['channel_partner'])
channel_partners_routes.register('sub_channel_partners', ChannelPartnerNestedViewSet, basename='channelpartners-subchannelpartner', parents_query_lookups=['parent_channel_partner'])
channel_partners_routes.register('organizations', OrganizationNesetedViewSet, basename='channelpartners-organization', parents_query_lookups=['channel_partner'])
channel_partners_routes.register('reports', ChannelPartnerServiceReportsViewSet, basename='channelpartners-reports',  parents_query_lookups=['channel_partner'])

organization_routes = channel_partners_router.register('organizations', OrganizationViewSet, basename='organization')
organization_users_routes = organization_routes.register('users', OrganizationUserViewSet, basename='organizations-user', parents_query_lookups=['organization'])
organization_routes.register('cloud_systems', CloudSystemNestedViewSet, basename='organizations-cloudsystem', parents_query_lookups=['organization'])
organization_routes.register('services', OrganizationServiceViewSet, basename='channelpartners-owned-service', parents_query_lookups=['organization'])
organization_routes.register('reports', OrganizationServiceReportsViewSet, basename='organizations-reports', parents_query_lookups=['organization'])


group_routes = channel_partners_router.register('groups', SystemGroupViewSet, basename='group')
group_routes.register('users', SystemGroupUserViewSet, basename='group-user', parents_query_lookups=['system_group'])

channel_partners_router.register(
    'cloud_systems', CloudSystemViewSet, basename='cloudsystem'
)

router = channel_partners_router
