"""cloud URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.8/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Add an import:  from blog import urls as blog_urls
    2. Add a URL to urlpatterns:  url(r'^blog/', include(blog_urls))
"""

from django.conf.urls import include, url
from django.contrib import admin
from django.shortcuts import redirect, render
from django.views.generic.base import TemplateView, RedirectView
from django.conf import settings
from django.conf.urls.static import static
from django.db import DEFAULT_DB_ALIAS, connections
from django.db.migrations.executor import MigrationExecutor
from django.http import HttpResponse
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from notifications import urls as notifications_urls
from cloud.views.meta import app_view, robots_txt
from cloud.views.utils import serve_static


def redirect_login(request):
    target_url = '/login'
    if 'QUERY_STRING' in request.META:
        target_url += '?%s' % request.META['QUERY_STRING']
    return redirect(target_url)


def health_check(request):
    executor = MigrationExecutor(connections[DEFAULT_DB_ALIAS])
    plan = executor.migration_plan(executor.loader.graph.leaf_nodes())
    status = 503 if plan else 200
    return HttpResponse(status=status)


def view_404(request, *args, **kwargs):
    return render(request, 'static/index.html')


schema_view = get_schema_view(
   openapi.Info(
      title="Cloud Portal API",
      default_version='v1',
      description="Api calls for cloud portal"
   ),
   public=True,
   permission_classes=(permissions.AllowAny,),
)


urlpatterns = [
    url(r'^swagger(?P<format>\.json|\.yaml)$', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    url(r'^swagger/$', schema_view.with_ui(), name='swagger'),
    url(r'^health/', health_check),
    url(r'^admin/login/', redirect_login),
    url(r'^admin/logout/', RedirectView.as_view(url='/logout'), name='logout'),
    url(r'^admin/cms/', include('cms.admin_urls')),
    url(r'^admin/notifications/', include('notifications.admin_urls')),
    url(r'^admin/', admin.site.urls),
    url(r'^api/', include('api.urls')),
    url(r'^api/cms/', include('cms.urls')),
    url(r'^api/upload/', include('upload.urls')),
    url(r'^api/notifications/', include(notifications_urls.public_patterns)),
    url(r'^notifications/', include('notifications.urls')),
    url(r'^oauth/', include('oauth.urls')),
    url(r'^admin_tools/', include('admin_tools.urls')),
    url(r'^zapier/', include('zapier.urls')),

    url(r'^apple-app-site-association',
        TemplateView.as_view(template_name="static/apple-app-site-association",
                             content_type='application/json')),
    url(r'^\.well-known/apple-app-site-association',
        TemplateView.as_view(template_name="static/apple-app-site-association",
                             content_type='application/json')),

    # The firebase service worker js file needs to be available at the root to be recognized by the Angular fire module.
    # Since we have no good way to serve a js file at the root without adding a url pattern or nginx conf,
    # we check for it here
    # TODO: Remove when we have a more convenient way to route to static files in new angular
    url(r'^firebase-messaging-sw.js$',
        TemplateView.as_view(template_name='static/scripts/vendor/firebase-messaging-sw.js',
                             content_type='application/javascript')),

    url(r'^ngsw.json$',
        TemplateView.as_view(template_name='static/ngsw.json',
                             content_type='application/json')),

    url(r'^ngsw-worker.js$',
        TemplateView.as_view(template_name='static/scripts/ngsw-worker.js',
                             content_type='application/javascript')),
    url(r'^authorize.*', TemplateView.as_view(template_name="static/authorization/index.html")),
    url(r'^robots.txt', robots_txt),
    url(r'^serve/(?P<static_path>.+?)/?$', serve_static, name="serve_static"),
    url(r'^(?!static|preview|admin).*', app_view)
]

if settings.LOCAL_ENVIRONMENT and not settings.TESTING:
    urlpatterns += static(settings.PREVIEW_URL, document_root=settings.PREVIEW_LOCATION)
    urlpatterns.insert(0, url(r'^profiler/', include('silk.urls')))

handler404 = 'cloud.urls.view_404'
