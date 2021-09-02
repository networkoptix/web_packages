from django.conf.urls import url

from notifications.views.send import cloud_notification_action, notification_test

urlpatterns = [
    url(r'cloud_notification/',
        cloud_notification_action, name="cloud_notification"),
    url(r'^test$', notification_test)
]
