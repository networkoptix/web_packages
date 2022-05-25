from datetime import datetime

from django.db.models import Q
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from api.helpers.exceptions import api_success, require_params
from cms.models import PortalNotification


def serialize_notifications(notifications):
    return [notification.get_serialized() for notification in notifications]


def validate_notification_ids(notifications):
    if not isinstance(notifications, list):
        raise ValidationError('Must be a list')

    if non_integer := [notification for notification in notifications if not isinstance(notification, int)]:
        raise ValidationError(
            f'All values must be integers, the following are invalid: {non_integer}')


def get_notifications(request):
    current = datetime.now()
    current_build=PortalNotification.calc_build(settings.VERSION)
    notifications = PortalNotification.objects.filter(
        ~Q(min_ts__gt=current), ~Q(max_ts__lt=current), ~Q(users_viewed=request.user), Q(build_raw__gte=current_build) | Q(build_raw__isnull=True))
    return {
        'currentBuild': settings.VERSION,
        'notifications': serialize_notifications(notifications)
    }


def mark_read(request):
    require_params(request, {'notificationIds': validate_notification_ids})
    notification_ids = request.data.get('notificationIds')
    notifications = PortalNotification.objects.filter(
        id__in=notification_ids).exclude(users_viewed=request.user)
    request.user.portalnotification_set.add(
        *[notification.id for notification in notifications])
    return {
        **get_notifications(request),
        'markedRead': serialize_notifications(notifications)
    }


@api_view(("POST", "GET"))
@permission_classes((IsAuthenticated, ))
def notifications(request):
    handler = get_notifications if request.method == 'GET' else mark_read
    return api_success(handler(request))
