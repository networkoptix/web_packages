from django.conf.urls import url, include
from django.urls import path
from notifications.views.send import send_notification
from notifications.views.maintenance import health_email, health_push
from notifications.views.email_notification import email_notification
from notifications.views.push_notification import push_notification, Subscriptions, \
    DeviceSubscriptionListView

public_patterns = [
    url(r'^push_notification$', push_notification, name='push_notification'),
    url(r'^email_notification$', email_notification, name='email_notification'),
    path('subscriptions/<str:deviceToken>', Subscriptions.as_view(), name='subscriptions'),
    path('subscriptions', DeviceSubscriptionListView.as_view(), name='subscriptions')
]

urlpatterns = [
    url(r'^send$', send_notification),
    url(r'^maintenance/health$', health_email),
    url(r'^maintenance/health_push$', health_push),
    url('', include(public_patterns))
]
