import uuid
from typing import Iterable

from django.core.cache import caches
from django.db.models import Q
from drf_spectacular.utils import extend_schema
from rest_framework import exceptions
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from partners.auth.helpers import AuthHelper
from partners.auth.internal_auth import (
    NxS2SAuthentication,
    NxTokenAuthentication,
)
from partners.auth.introspect import CdbTokenIntrospect
from partners.auth.system_auth import NxCloudSystemBasicAuthenticationInternal
from partners.auth.token_auth import NxCloudOauthTokenAuthentication
from partners.models import (
    CloudSystemId,
    CloudUser,
    VmsRoles,
)
from partners.permissions import (
    IsInternalService,
    IsInternalToken,
    IsOneOfAuthorized,
)
from partners.serializers.v2.serializers import (
    CloudStorageUsageReportSerializer,
    SystemMembershipSerializer,
    SystemUserSerializer,
    UserListSerializer,
)
from partners.views.v2.views import CloudSystemViewSet
from tools.versioning.decorators import version_range
from tools.versioning.utils import Versions


def get_authorized_system(
        request,
        system_id: uuid.UUID,
        roles: Iterable | VmsRoles.AnyRole | None = None) -> CloudSystemId:
    # Set default roles if none are provided
    if not roles:
        roles = VmsRoles.ADMIN_AND_POWER_USER

    # Check if the request already has a cloud_system attribute
    if cloud_system := AuthHelper.get_cloud_system(request):
        # Verify if the system_id matches the cloud_system's system_id
        if str(system_id) != str(cloud_system.system_id):
            raise exceptions.PermissionDenied(detail='Insufficient permissions.')
        return cloud_system
    if not (hasattr(request, 'user') and request.user.is_authenticated):
        raise exceptions.NotAuthenticated()
    if cloud_system := CloudSystemId.objects.filter(system_id=system_id).first():
        # If system has no organization then it has been disconnected.
        # We can return 403, because it is out of a cloud
        if not cloud_system.organization:
            raise exceptions.PermissionDenied(detail='Insufficient permissions or system does not exists.')

        # Check if the request made with internal service token
        if internal_service := AuthHelper.get_internal_service(request):
            if internal_service.is_request_allowed(request):
                return cloud_system

        # Check if the request user is an authenticated CloudUser
        if not AuthHelper.get_cloud_user(request):
            raise exceptions.PermissionDenied(detail='Insufficient permissions or system does not exists.')

        # Check if the request has the required VMS roles
        if CdbTokenIntrospect.has_vms_roles(request, system_id, roles):
            return cloud_system
        # Check if the user has the required VMS roles
        if cloud_system.has_vms_role(request.user, vms_roles=roles):
            return cloud_system

    # Raise an exception if permissions are insufficient or the system does not exist
    raise exceptions.PermissionDenied(detail='Insufficient permissions or system does not exists.')


@extend_schema(
    responses=SystemMembershipSerializer(many=True),
    description='Retrieves all systems associated with a specified user email',
    summary='Get Systems By User Email',
    tags=['Internal'],
)
@version_range(Versions(min_version="v2"))
@api_view(['GET'])
@authentication_classes([NxCloudOauthTokenAuthentication, NxS2SAuthentication])
@permission_classes([IsAuthenticated])
def user_systems(request, email):
    if AuthHelper.get_cloud_user(request):
        if request.user.email.lower() != email.lower():
            raise exceptions.PermissionDenied(detail='Insufficient permissions.')
        user = request.user
    elif AuthHelper.get_internal_service(request):
        user = CloudUser.objects.filter(email=email).first()
    else:
        raise exceptions.PermissionDenied(detail='Insufficient permissions.')
    systems = user.systems_memberships()
    serializer = SystemMembershipSerializer(systems, many=True)
    return Response(serializer.data)


@extend_schema(
    responses=SystemUserSerializer,
    summary='Get a specific user for a system',
    tags=['Internal'],
)
@version_range(Versions(min_version="v2"))
@api_view(['GET'])
@authentication_classes([NxCloudSystemBasicAuthenticationInternal, NxCloudOauthTokenAuthentication, NxS2SAuthentication])
@permission_classes([IsAuthenticated])
def system_user(request, system_id, email):
    email = email.lower()
    if request.user and request.user.email.lower() == email:
        system = get_authorized_system(request, system_id, roles=VmsRoles.ANY_ROLE)
    else:
        system = get_authorized_system(request, system_id, roles=VmsRoles.ADMIN_AND_POWER_USER)
    if not system or not system.organization:
        raise exceptions.NotFound('System not found')
    user_rel = system.get_user_role_by_email(email=email)
    if not user_rel:
        # There is no user relations for system users, so we need to create a fake one
        user_rel = {'user__email': email, 'roles': [], 'type': None}
    serializer = SystemUserSerializer(user_rel)

    return Response(serializer.data)


@extend_schema(
    responses=SystemUserSerializer(many=True),
    summary='Get users for a system',
    tags=['Internal'],
)
@version_range(Versions(min_version="v2"))
@api_view(['GET'])
@authentication_classes([NxCloudSystemBasicAuthenticationInternal, NxCloudOauthTokenAuthentication, NxS2SAuthentication])
@permission_classes([IsAuthenticated])
def system_users(request, system_id):
    system: CloudSystemId = get_authorized_system(request, system_id, roles=VmsRoles.ADMIN_AND_POWER_USER)
    if not system or not system.organization:
        raise exceptions.NotFound('System not found')
    users = system.get_all_users()
    serializer = SystemUserSerializer(users, many=True)
    return Response(serializer.data)


@extend_schema(
    responses=UserListSerializer,
    summary='Get all users that have access to some channel partner or organization',
    tags=['Internal'],
)
@version_range(Versions(min_version="v2", deprecated_in="v2"))
@api_view(['GET'])
@authentication_classes([NxTokenAuthentication, NxS2SAuthentication])
@permission_classes([IsOneOfAuthorized(permissions_classes=[IsInternalToken(), IsInternalService()])])
# TODO: CLOUD-12310
def all_org_users(request):
    users_dict = {
        'users': CloudUser.objects.filter(
            Q(organizations__isnull=False) |
            Q(channel_partners__isnull=False))
        .distinct().values_list('email', flat=True)
    }
    serializer = UserListSerializer(users_dict)
    return Response(serializer.data)


@extend_schema(
    summary='Submit a cloud storage usage report',
    tags=['Internal'],
    request=CloudStorageUsageReportSerializer,
    responses=CloudStorageUsageReportSerializer,
)
@version_range(Versions(min_version="v2"))
@api_view(['POST'])
@authentication_classes([NxTokenAuthentication, NxS2SAuthentication])
@permission_classes([IsOneOfAuthorized(permissions_classes=[IsInternalToken(), IsInternalService()])])
def cloud_storage_usage_report(request):
    serializer = CloudStorageUsageReportSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    cloud_system = serializer.validated_data['usedDevices']['cloud_system']
    caches['default'].delete(CloudSystemViewSet.get_service_quantity_cache_key(cloud_system))
    serializer.save_security_metrics()
    return Response(serializer.data)
