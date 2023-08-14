from django.urls import path

from utils import views

urlpatterns = [
    path('health_check', views.HealthCheckView.as_view(), name='health_check')
]