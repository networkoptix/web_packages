from django.conf import settings
from django.urls import path

from tools.versioning.utils import versioned_include


versioned_modules = [
    'partners.views.v2.urls',
    'partners.views.v3.urls',
]

urlpatterns = []
for version in settings.AVAILABLE_VERSIONS:
    urlpatterns += [
        path('', versioned_include(version, 'partners', versioned_modules))
    ]