from django.urls import (
    converters,
    include,
    path,
    re_path,
)
from rest_framework_extensions.routers import ExtendedSimpleRouter

from partners.views import (
    ChannelPartnerAvailableServiceViewset,
    ChannelPartnerExternalIdViewset,
    ChannelPartnerNestedViewSet,
    ChannelPartnerOwnedServiceViewset,
    ChannelPartnerServiceExternalIdViewset,
    ChannelPartnerUserViewSet,
    ChannelPartnerViewSet,
    CloudSystemExternalIdViewset,
    CloudSystemNestedViewSet,
    CloudSystemViewSet,
    OrganizationNesetedViewSet,
    OrganizationrExternalIdViewset,
    OrganizationServiceViewset,
    OrganizationUserViewSet,
    OrganizationViewSet,
    SystemGroupUserViewSet,
    SystemGroupViewSet,
    all_org_users,
    all_services,
    channel_partner_roles,
    organization_roles,
    partner_events,
    system_user,
    system_users,
    user_systems,
)


channel_partner_urls = [
    path('channel_partner_roles', channel_partner_roles, name='channel_partner_roles'),
    path('organization_roles', organization_roles, name='organization_roles'),
    path('events', partner_events, name='events'),
    path('services', all_services, name='services')
]

channel_partner_internal_urls = [
    path('events', partner_events, name='events'),
    path('services', all_services, name='services'),
    path('systems/<uuid:system_id>/users', system_users, name='system_users'),
    path('systems/<uuid:system_id>/users/<str:email>', system_user, name='system_user'),
    path('users/<str:email>/systems', user_systems, name='user_systems'),
    path('users/all', all_org_users, name='all_org_users')
]

channel_partners_router = ExtendedSimpleRouter()
channel_partners_router.register(rf'^channel_partners/(?P<channel_partner_id>{converters.UUIDConverter.regex})/external_ids', ChannelPartnerExternalIdViewset, basename='channelpartner-externalid')
channel_partners_router.register(rf'^organizations/(?P<channel_partner_id>{converters.UUIDConverter.regex})/external_ids', OrganizationrExternalIdViewset, basename='organization-externalid')
channel_partners_router.register(rf'^services/(?P<channel_partner_id>{converters.UUIDConverter.regex})/external_ids', ChannelPartnerServiceExternalIdViewset, basename='channelpartnerservice-externalid')
channel_partners_router.register(rf'^cloud_systems/(?P<channel_partner_id>{converters.UUIDConverter.regex})/external_ids', CloudSystemExternalIdViewset, basename='cloudsystem-externalid')

channel_partners_routes = channel_partners_router.register('channel_partners', ChannelPartnerViewSet, basename='channelpartner')
channel_partners_routes.register('users', ChannelPartnerUserViewSet, basename='channelpartners-user', parents_query_lookups=['channel_partner'])
channel_partners_routes.register('services/owned', ChannelPartnerOwnedServiceViewset, basename='channelpartners-owned-service', parents_query_lookups=['created_by_channel_partner'])
channel_partners_routes.register('services/available', ChannelPartnerAvailableServiceViewset, basename='channelpartners-available-service', parents_query_lookups=['channel_partner'])
channel_partners_routes.register('sub_channel_partners', ChannelPartnerNestedViewSet, basename='channelpartners-subchannelpartner', parents_query_lookups=['parent_channel_partner'])
channel_partners_routes.register('organizations', OrganizationNesetedViewSet, basename='channelpartners-organization', parents_query_lookups=['channel_partner'])

organization_routes = channel_partners_router.register('organizations', OrganizationViewSet, basename='organization')
organization_users_routes = organization_routes.register('users', OrganizationUserViewSet, basename='organizations-user', parents_query_lookups=['organizations'])
organization_routes.register('cloud_systems', CloudSystemNestedViewSet, basename='organizations-cloudsystem', parents_query_lookups=['organization'])
organization_routes.register('services', OrganizationServiceViewset, basename='channelpartners-owned-service', parents_query_lookups=['organization'])

group_routes = channel_partners_router.register('groups', SystemGroupViewSet, basename='group')
group_routes.register('users', SystemGroupUserViewSet, basename='group-user', parents_query_lookups=['system_group'])

channel_partners_router.register(
    'cloud_systems', CloudSystemViewSet, basename='cloudsystem'
)

urlpatterns = [
    path('', include(channel_partners_router.urls)),
    path('', include(channel_partner_urls)),
    re_path(r'^internal/', include(channel_partner_internal_urls)),
]
