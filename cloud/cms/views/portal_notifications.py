from datetime import datetime

from django.db.models import Q
from django.conf import settings
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework.decorators import api_view, permission_classes
from oauth2_provider.contrib.rest_framework import IsAuthenticatedOrTokenHasScope
from rest_framework.exceptions import ValidationError

from cloud.helpers.exceptions import api_success, require_params
from cms.models import PortalNotification
from cms.serializers import PortalNotificationIdSerializer, PortalNotificationListSerializer, PortalNotificationSerializer


def serialize_notifications(notifications):
    return [PortalNotificationSerializer(notification).data for notification in notifications]


def get_notifications(request):
    current = datetime.now()
    current_build = PortalNotification.calc_build(settings.VERSION)
    notifications = PortalNotification.objects.filter(
        ~Q(min_ts__gt=current), ~Q(max_ts__lt=current), ~Q(users_viewed=request.user), Q(build_raw__gte=current_build) | Q(build_raw__isnull=True))
    return PortalNotificationListSerializer({'notifications': serialize_notifications(notifications)}).data


def mark_read(request):
    serializer = PortalNotificationIdSerializer(data=request.data)
    serializer.is_valid()
    notification_ids = serializer.data['notificationIds']
    notifications = PortalNotification.objects.filter(
        id__in=notification_ids).exclude(users_viewed=request.user)
    request.user.portalnotification_set.add(
        *[notification.id for notification in notifications])
    return PortalNotificationListSerializer({
        **get_notifications(request),
        'markedRead': serialize_notifications(notifications)
    }).data


notifications_description = "Returns a list of portal notifications for user."


@swagger_auto_schema(method="GET",
                     operation_description=notifications_description,
                     responses={'200': openapi.Response('PortalNotificationList', PortalNotificationListSerializer)})
@swagger_auto_schema(method="POST",
                     operation_description=f"{notifications_description} "
                                           f"If POST request with notificationId's in body, "
                                           f"those notifications get mark read.",
                     request_body=PortalNotificationIdSerializer,
                     responses={'200': openapi.Response('PortalNotificationList', PortalNotificationListSerializer)})
@api_view(("POST", "GET"))
@permission_classes((IsAuthenticatedOrTokenHasScope, ))
def notifications(request):
    handler = get_notifications if request.method == 'GET' else mark_read
    return api_success(handler(request))
