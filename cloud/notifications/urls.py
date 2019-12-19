from django.conf.urls import url, include
from notifications.views.send import send_notification
from notifications.views.push_notification import push_notification, register_device, Subscribe, \
    DeviceSubscriptionListView, unregister_device

public_patterns = [
    url(r'^push_notification$', push_notification),
    url(r'^register_device', register_device),
    url(r'^unregister_device', unregister_device),
    url(r'^subscribe', Subscribe.as_view()),
    url(r'^subscriptions', DeviceSubscriptionListView.as_view()),
]

urlpatterns = [
    url(r'^send$',  send_notification),
    url('', include(public_patterns))
]
