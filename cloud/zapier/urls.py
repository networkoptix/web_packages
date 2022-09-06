from django.urls import re_path
import zapier.views as views

urlpatterns = [
    re_path(r'^ping', views.ping),
    re_path(r'^get_systems', views.get_systems),
    re_path(r'^subscribe', views.subscribe_webhook),
    re_path(r'^unsubscribe', views.unsubscribe_webhook),
    re_path(r'^poll_for_subscribe', views.mock_subscribe),
    re_path(r'^send_generic_event',  views.zapier_send_generic_event),
    re_path(r'.*', views.nx_http_action),
]
