from django.conf.urls import include
from django.urls import path, re_path
from notifications.views.send import send_notification
from notifications.views.maintenance import health_email, health_push
from notifications.views.email_notification import email_notification
from notifications.views.push_notification import push_notification, Subscriptions, \
    DeviceSubscriptionListView

public_patterns = [
    re_path(r'^push_notification$', push_notification, name='push_notification'),
    re_path(r'^email_notification$', email_notification, name='email_notification'),
    path('subscriptions/<str:deviceToken>', Subscriptions.as_view(), name='subscriptions'),
    path('subscriptions', DeviceSubscriptionListView.as_view(), name='subscriptions'),
    re_path(r'^maintenance/health$', health_email),
    re_path(r'^maintenance/health_push$', health_push),
]

urlpatterns = [
    re_path(r'^send$', send_notification),
    re_path(r'^maintenance/health$', health_email),
    re_path(r'^maintenance/health_push$', health_push),
    re_path('', include(public_patterns))
]
