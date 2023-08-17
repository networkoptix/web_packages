from django.urls import path

from utils import views

urlpatterns = [
    path('health_check', views.HealthCheckView.as_view(), name='health_check'),
    path('simple_health_check', views.simple_health_check, name='simple_health_check')
]
