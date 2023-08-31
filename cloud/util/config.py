import logging

from django.conf import settings
from django.core.cache import caches

from cloud.customization_context import customization_ctx, hostname_ctx
from util.helpers import get_cloud_host_by_customization, get_cached_customization
from util.instance_config import get_init_config

logger = logging.getLogger(__name__)


def get_cached_config(customization):
    return get_config(customization=customization, use_cache=True)


def get_config_hostname(customization):
    if customization and customization != customization_ctx.get():
        # called with customization that is different from request one or in testing
        # use customization's primary host
        host = get_cloud_host_by_customization(customization)
    else:
        customization = customization or customization_ctx.get()
        host = hostname_ctx.get() or get_cloud_host_by_customization(customization)
    return host


def get_customization_config(customization=None):
    host = get_config_hostname(customization)
    if not customization:
        logger.warning('Customisation must be given.')
    if not host:
        logger.warning('Host must be given.')

    conf = {
        'customization': customization,
        'host': host,
        'cloud_db': {'url': f'https://{host}/cdb'},
        'cloud_portal': {'url': f'https://{host}'},
        'cloud_storage': {'url': f'https://{host}/cdb/storage'},
        'cloud_storages': {'url': f'https://{host}/cdb/storages'},
    }

    if settings.LOCAL_ENVIRONMENT:
        _HOST = 'cloud-test.hdw.mx'
        conf["cloud_db"]["url"] = f"https://{_HOST}/cdb"
        conf["cloud_storage"]["url"] = f"https://{_HOST}/cdb/storage"
        conf["cloud_storages"]["url"] = f"https://{_HOST}/cdb/storages"
    return conf


def get_config(customization=None, use_cache=False):
    key = f'cloud_portal_config_common-{settings.VERSION}'
    _cache = caches['local']
    if not (config := _cache.get(key)) or not use_cache:
        config = get_init_config()
        _cache.set(key, config)
    customization_config = get_customization_config(customization)
    config.update(**customization_config)
    return config


def get_cloud_portal_url(customization=None):
    if not customization:
        customization = customization_ctx.get()
    return get_customization_config(customization)["cloud_portal"]["url"]


def get_cloud_db_url(customization=None):
    if not customization:
        customization = customization_ctx.get()
    return get_customization_config(customization)["cloud_db"]["url"]
