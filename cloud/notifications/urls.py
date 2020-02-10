from django.conf.urls import url, include
from django.urls import path
from notifications.views.send import send_notification
from notifications.views.push_notification import push_notification, register_device, Subscriptions, \
    DeviceSubscriptionListView, unregister_device

public_patterns = [
    url(r'^push_notification$', push_notification),
    url(r'^register_device', register_device),
    url(r'^unregister_device', unregister_device),
    path('subscriptions/<str:deviceToken>', Subscriptions.as_view()),
    path('subscriptions', DeviceSubscriptionListView.as_view())
]

urlpatterns = [
    url(r'^send$',  send_notification),
    url('', include(public_patterns))
]
