"""
URL configuration for channel_partners project.
"""
from django.conf import settings
from django.contrib import admin
from django.urls import path, include, re_path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from partners.views import grant_access
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
if settings.DEBUG:
    urlpatterns += [path('internal/grant_access', grant_access, name='grant_access')]

if settings.SILK_ENABLED:
    urlpatterns.insert(0, path('profiler/', include('silk.urls')))

urlpatterns = [
    re_path(r'^partners/', include(urlpatterns))
]
