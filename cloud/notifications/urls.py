from django.conf.urls import url, include
from django.urls import path
from notifications.views.send import send_notification
from notifications.views.maintenance import maintenance_health
from notifications.views.push_notification import push_notification, Subscriptions, \
    DeviceSubscriptionListView

public_patterns = [
    url(r'^push_notification$', push_notification),
    # url(r'^register_device', register_device),
    path('subscriptions/<str:deviceToken>', Subscriptions.as_view()),
    path('subscriptions', DeviceSubscriptionListView.as_view())
]

urlpatterns = [
    url(r'^send$',  send_notification),
    url(r'^maintenance/health$',  maintenance_health),
    url('', include(public_patterns))
]
