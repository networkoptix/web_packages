from django.conf.urls import url
from notifications.views.send import send_notification
from notifications.views.push_notification import push_notification

urlpatterns = [
    url(r'^send$',  send_notification),
    url(r'^push_notification$', push_notification)
]
