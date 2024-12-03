from uuid import uuid4

from django.core.cache import caches
from django.core.exceptions import ImproperlyConfigured
from drf_spectacular.utils import extend_schema
from rest_framework import exceptions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from rest_framework_extensions.mixins import NestedViewSetMixin

from partners.auth.system_auth import NxCloudSystemBasicAuthentication
from partners.auth.token_auth import NxCloudOauthTokenAuthentication
from partners.models import (
    ChannelPartner,
    CloudSystemId,
    Organization,
    VmsRoles,
)
from partners.permissions import (
    CanPerformChannelPartnerAction,
    IsAuthenticatedCloudUserOrSystem,
)
from partners.serializers.v3.service_quantity_serializers import (
    ServiceQuantityChangeSerializerV3,
    ServiceQuantityReadSerializerV3,
)
from partners.services.cloud_system_service import CloudSystemService
from partners.views.v2.views import DefaultPagination
from tools.versioning.decorators import version_range
from tools.versioning.utils import (
    Versions,
    versioned_serializer,
)
from tools.versioning.views import VersionedViewMixin


@extend_schema(tags=['Systems'])
class CloudSystemViewSet(VersionedViewMixin,
                         NestedViewSetMixin,
                         GenericViewSet):
    http_method_names = ['get', 'post', 'patch', 'delete']
    authentication_classes = (NxCloudSystemBasicAuthentication, NxCloudOauthTokenAuthentication)
    pagination_class = DefaultPagination
    queryset = CloudSystemId.objects.all().order_by('created_ts').select_related('organization')
    lookup_field = 'system_id'
    lookup_url_kwarg = 'id'

    def get_serializer_class_for_action(self):
        if self.action == 'service_quantity' and self.request.method == 'GET':
            return ServiceQuantityReadSerializerV3
        if self.action == 'service_quantity' and self.request.method == 'PATCH':
            return ServiceQuantityChangeSerializerV3

        return super().get_serializer_class_for_action()

    def get_permissions(self):
        perms = [IsAuthenticatedCloudUserOrSystem()]
        if self.action == 'service_quantity' and self.request.method == 'GET':
            perms.append(CanPerformChannelPartnerAction(CloudSystemId.is_member_in_branch,
                                                        system_allowed=True,
                                                        direct_access_allowed=VmsRoles.ANY_ROLE))
        if self.action == 'service_quantity' and self.request.method == 'PATCH':
                perms.append(CanPerformChannelPartnerAction(CloudSystemId.can_set_services))

        if self.action and len(perms) == 1 and self.detail:
            raise ImproperlyConfigured('Must add a permission for a detail view')
        return perms

    @staticmethod
    def get_service_quantity_lock(obj):
        return f'views-locks-cloud_system-service_quantity-{obj.id}'

    @staticmethod
    def get_service_quantity_cache_key(obj):
        return f'views-cloud_system-service_quantity-{obj.id}'

    @version_range(versions=Versions(min_version="v3"))
    @extend_schema(summary='Get service quantities for a System',
                   methods=['GET'],
                   responses={200: ServiceQuantityReadSerializerV3(many=True)},
                   extensions={'x-permission': f'{Organization.permissions.access_systems} for Organization'})
    @extend_schema(summary='Set service quantities for a System',
                   methods=['PATCH'],
                   request=ServiceQuantityChangeSerializerV3(many=True),
                   responses={200: ServiceQuantityReadSerializerV3(many=True)},
                   extensions={'x-permission': f'{ChannelPartner.permissions.add_remove_service_quantities}'
                                               f' for Organization\'s Channel Partner'})
    @action(detail=True,
            methods=['get', 'patch'],
            pagination_class=None)
    def service_quantity(self, request, id):
        if self.request.method == 'GET':
            return self.get_services_quantity(request, id)
        if self.request.method == 'PATCH':
            return self.set_services_quantity(request, id)

    def get_services_quantity(self, request, id):
        # Get System object
        system: CloudSystemId = self.get_object()
        cache_key = self.get_service_quantity_cache_key(system)

        if not (data := caches['default'].get(cache_key)):
            serializer = ServiceQuantityReadSerializerV3(system.get_current_services_list(), many=True)
            data = serializer.data
            caches['default'].set(cache_key, data, timeout=86400)
        return Response(data)

    def set_services_quantity(self, request, id):
        system: CloudSystemId = self.get_object()
        if not system.activated:
            raise exceptions.ValidationError('System is not activated.')

        lock_key = self.get_service_quantity_lock(system)
        lock_val = f'{uuid4()}'
        if not caches['default'].add(lock_key, lock_val, timeout=60):
            return Response(
                data={"message": f"System {system.system_id} service quantity "
                                 f"was being modified during request."},
                status=429,
                headers={'Retry-After': 2})

        serializer = self.get_serializer_class()(
            cloud_system=system,
            data=request.data,
            context=self.get_serializer_context(),
            many=True
        )
        if not serializer.is_valid(raise_exception=False):
            caches['default'].delete(self.get_service_quantity_lock(system))
            serializer.is_valid(raise_exception=True)
        serializer.save()
        system.calculate_current_services(save_results=True)
        response_serializer_class = versioned_serializer(ServiceQuantityReadSerializerV3, self.request.version)
        response_serializer = response_serializer_class(system.get_current_services_list(), many=True)
        data = response_serializer.data
        caches['default'].set(self.get_service_quantity_cache_key(system), data, timeout=86400)
        caches['default'].delete(self.get_service_quantity_lock(system))
        CloudSystemService.notify_service_change(system)
        return Response(data)