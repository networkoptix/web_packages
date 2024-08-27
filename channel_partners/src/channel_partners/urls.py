"""
URL configuration for channel_partners project.
"""
from django.conf import settings
from django.contrib import admin
from django.urls import (
    include,
    path,
    re_path,
)
from drf_spectacular.views import SpectacularSwaggerView

from partners.views.v2.internal_views import grant_access
from tools.versioning.utils import swagger_urls


swagger_ui = SpectacularSwaggerView.as_view(url_name='schema-internal-v2')

urlpatterns = [
    path('', swagger_ui, name='swagger-ui-home'),
    path('admin/', admin.site.urls),
    path('utils/', include('utils.urls')),
    path('api/', include('partners.urls')),
]
if settings.DEBUG:
    urlpatterns += [path('internal/grant_access', grant_access, name='grant_access')]

if settings.SILK_ENABLED:
    urlpatterns.insert(0, path('profiler/', include('silk.urls')))

urlpatterns = [
    re_path(r'^partners/', include(urlpatterns)),
    re_path(r'^partners/', include(swagger_urls('partners.urls')))
]

