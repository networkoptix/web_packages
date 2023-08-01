import logging

from django.conf import settings

from cloud.customization_context import customization_ctx
from util.helpers import get_cloud_host_by_customization
from util.instance_config import get_init_config

logger = logging.getLogger(__name__)


def get_cached_config(customization):
    from django.core.cache import caches

    local_cache = caches['local']
    config = local_cache.get(f'cloud_portal_config_{customization}')
    if not config:
        config = get_config(customization)
        local_cache.set(f'cloud_portal_config_{customization}', config, timeout=3600)  # 1 hour timeout
    return config


def get_config(customization=None):
    if not customization:
        customization = customization_ctx.get()
    conf = get_init_config()
    host = get_cloud_host_by_customization(customization)
    conf = {
        'customization': customization,
        'host': host,
        'cloud_db': {'url': f'https://{host}/cdb'},
        'cloud_portal': {'url': f'https://{host}'},
        'cloud_storage': {'url': f'https://{host}/cdb/storage'},
        'cloud_storages': {'url': f'https://{host}/cdb/storages'},
        **conf
    }
    if settings.LOCAL_ENVIRONMENT:
        _HOST = 'https://cloud-test.hdw.mx'
        conf["cloud_db"]["url"] = f"{_HOST}/cdb"
        conf["cloud_portal"]["url"] = f'{_HOST}'
        conf["cloud_storage"]["url"] = f"{_HOST}/cdb/storage"
        conf["cloud_storages"]["url"] = f"{_HOST}/cdb/storages"
    return conf


def get_cloud_portal_url(customization=None):
    if not customization:
        customization = customization_ctx.get()
    return get_cached_config(customization)["cloud_portal"]["url"]
