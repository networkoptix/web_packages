"""
URL configuration for channel_partners project.
"""
from django.conf import settings
from django.contrib import admin
from django.urls import path, include, re_path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from utils.views import simple_health_check

swagger_ui = SpectacularSwaggerView.as_view(url_name='schema-internal')

urlpatterns = [
    path('', swagger_ui, name='swagger-ui-home'),
    path('admin/', admin.site.urls),
    path('utils/', include('utils.urls')),
    path('api/v2/', include('partners.urls')),
    path('api-internal/schema/', SpectacularAPIView.as_view(
        urlconf='partners.urls'
    ), name='schema-internal'),
    path('api-docs/', swagger_ui, name='swagger-ui'),
]

if settings.SILK_ENABLED:
    urlpatterns.insert(0, path('profiler/', include('silk.urls')))
