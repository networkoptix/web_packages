import logging
import os
import sys
import yaml

logger = logging.getLogger(__name__)


def get_config(customization=None):
    # Allows cloud_portal to run migratedb, readstructure, and filldata.
    # In an actual instance gunicorn is used to run cloud_portal
    PYTHON_RUNNING = any([command in sys.argv for command in ['manage.py', './manage.py']])
    if not customization:
        customization = os.getenv('CUSTOMIZATION')
    if not customization:
        customization = 'default'

    conf_dir = os.getenv('CLOUD_PORTAL_BASE_CONF_DIR')
    if not conf_dir:
        conf_dir = os.path.dirname(__file__)
    file_path = os.path.join(conf_dir, customization, 'cloud_portal.yaml')  # normal case - working instance
    if not os.path.exists(file_path) and not PYTHON_RUNNING:
        msg = f"To fix this problem run force update on the latest accepted review " \
              f"for {customization}'s cloud portal asset to fix the problem."
        logger.critical(msg)
        raise Exception(f"Unable to fetch config file. {msg}")
    if not os.path.isfile(file_path):  # this is for local environment
        file_path = os.path.join(conf_dir, '../../etc', 'cloud_portal.yaml')
    if not os.path.isfile(file_path):  # this is for Jenkins to collect static
        file_path = os.path.join(conf_dir, '..', 'cloud_portal.yaml')

    return yaml.safe_load(open(file_path))

