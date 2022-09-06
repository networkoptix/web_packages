from django.urls import re_path

from notifications.views.send import cloud_notification_action, notification_test

urlpatterns = [
    re_path(r'cloud_notification/',
        cloud_notification_action, name="cloud_notification"),
    re_path(r'^test$', notification_test)
]
