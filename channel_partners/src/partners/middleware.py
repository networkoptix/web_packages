from django.conf import settings
from django.core.cache import caches
from django.http import HttpRequest

from partners.models import CloudHost


def get_cloud_host(cloud_host_name: str) -> CloudHost | None:
    if not cloud_host_name:
        return None
    if settings.LOCAL_ENV and cloud_host_name == "localhost":
        cloud_host_name = settings.DEFAULT_HOST_NAME
    cache_key = f'cloud-host-{cloud_host_name}'
    if cloud_host := caches['local'].get(cache_key):
        if isinstance(cloud_host, CloudHost):
            return cloud_host
    if cloud_host := CloudHost.objects.filter(hostname=cloud_host_name).first():
        caches['local'].set(cache_key, cloud_host, timeout=7200)
    return cloud_host


def cloud_host_middleware(get_response):
    def middleware(request: HttpRequest):
        cloud_host_name = request.get_host().split(':')[0]
        request.cloud_host = get_cloud_host(cloud_host_name)
        response = get_response(request)
        return response

    return middleware
