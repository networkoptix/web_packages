import logging
import os
import sys
import yaml

logger = logging.getLogger(__name__)


class UnableToFetchConfigException(Exception):
    def __init__(self, msg):
        """
        Exception for when config file is missing.
        """
        self.msg = f"Unable to fetch config file. {msg}"


def get_cached_config(customization):
    from django.core.cache import caches

    local_cache = caches['local']
    config = local_cache.get(f'cloud_portal_config_{customization}')
    if not config:
        config = get_config(customization)
        local_cache.set(f'cloud_portal_config_{customization}', config, timeout=3600)  # 1 hour timeout
    return config


def get_config(customization=None):
    # Allows cloud_portal to run migratedb, readstructure, and filldata.
    # In an actual instance gunicorn is used to run cloud_portal
    PYTHON_RUNNING = any(['manage.py' in arg for arg in sys.argv])
    if not customization:
        customization = os.getenv('CUSTOMIZATION')
    if not customization:
        customization = 'default'

    conf_dir = os.getenv('CLOUD_PORTAL_BASE_CONF_DIR')
    if not conf_dir:
        conf_dir = os.path.dirname(__file__)
    file_path = os.path.join(conf_dir, customization, 'cloud_portal.yaml')  # normal case - working instance
    if not os.path.exists(file_path) and not PYTHON_RUNNING and os.getenv('INSTANCE_NAME') in ['prod', 'stage']:
        msg = f"To fix this problem run force update on the latest accepted review " \
              f"for {customization}'s cloud portal asset to fix the problem."
        logger.critical(msg)
        raise UnableToFetchConfigException(msg)
    if not os.path.isfile(file_path):  # this is for local environment
        file_path = os.path.join(conf_dir, '../../etc', 'cloud_portal.local.yaml')
    if not os.path.isfile(file_path):  # this is for Jenkins to collect static
        file_path = os.path.join(conf_dir, '..', 'cloud_portal.jenkins.yaml')

    return yaml.safe_load(open(file_path))

