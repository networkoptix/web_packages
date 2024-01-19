from django.urls import path

from utils import views


urlpatterns = [
    path('health_check', views.HealthCheckView.as_view(), name='health_check'),
    path('simple_health_check', views.simple_health_check, name='simple_health_check'),
    path('async_health_check', views.HealthCheckAsyncImports.as_view(), name='async_health_check'),
    path('celery_health_check', views.HealthCheckCelery.as_view(), name='celery_health_check'),

]
