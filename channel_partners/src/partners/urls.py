from django.urls import path, re_path, include, converters
from rest_framework_extensions.routers import ExtendedSimpleRouter
from .views import *

channe_partner_urls = [
    path('channel_partner_roles', channel_partner_roles, name='channel_partner_roles'),
    path('organization_roles', organization_roles, name='organization_roles'),
    path('events', partner_events, name='events'),
    path('services', all_services, name='services')
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
organization_routes.register('users', OrganizationUserViewSet, basename='organizations-user', parents_query_lookups=['organization'])
organization_routes.register('cloud_systems', CloudSystemNestedViewSet, basename='organizations-cloudsystem', parents_query_lookups=['organization'])
organization_routes.register('services', OrganizationServiceViewset, basename='channelpartners-owned-service', parents_query_lookups=['organization'])

channel_partners_router.register(
    'cloud_systems', CloudSystemViewSet, basename='cloudsystem'
)

urlpatterns = [
    re_path(r'^partners/', include(channel_partners_router.urls)),
    re_path(r'^partners/', include(channe_partner_urls))
]
