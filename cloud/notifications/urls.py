from django.conf.urls import url
from notifications.views.send import send_notification
from notifications.views.push_notification import push_notification, register_device, Subscribe

urlpatterns = [
    url(r'^send$',  send_notification),
    url(r'^push_notification$', push_notification),
    url(r'^register_device', register_device),
    url(r'^subscribe', Subscribe.as_view()),
]
