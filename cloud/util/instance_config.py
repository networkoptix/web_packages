import hashlib
import os
import sys
import yaml
import logging

logger = logging.getLogger(__name__)


class UnableToFetchConfigException(Exception):
    def __init__(self, msg):
        """
        Exception for when config file is missing.
        """
        self.msg = f"Unable to fetch config file. {msg}"


def get_init_config():
    # Allows cloud_portal to run migratedb, readstructure, and filldata.
    # In an actual instance gunicorn is used to run cloud_portal
    PYTHON_RUNNING = any(['manage.py' in arg for arg in sys.argv])

    conf_dir = os.getenv('CLOUD_PORTAL_BASE_CONF_DIR')
    if not conf_dir:
        conf_dir = os.path.dirname(__file__)
    file_path = os.path.join(conf_dir, 'cloud_portal.yaml')  # normal case - working instance
    if not os.path.exists(file_path) and not PYTHON_RUNNING and os.getenv('INSTANCE_NAME') in ['prod', 'stage']:
        msg = f"Something went wrong as soon as file {file_path} does not exist."
        logger.critical(msg)
        raise UnableToFetchConfigException(msg)
    if not os.path.isfile(file_path):  # this is for local environment
        file_path = os.path.join(conf_dir, '../../etc', 'cloud_portal.local.yaml')
    if not os.path.isfile(file_path):  # this is for Jenkins to collect static
        file_path = os.path.join(conf_dir, '..', 'cloud_portal.jenkins.yaml')

    return yaml.safe_load(open(file_path))


def get_structures_hash():
    conf_dir = os.path.dirname(__file__)
    struct_dir = os.path.join(conf_dir, os.path.pardir, 'cms/structures')
    dirpath, _, filenames = next(os.walk(struct_dir))
    md5hash = hashlib.md5()
    for fn in filenames:
        if not fn.endswith('.json'):
            continue
        with open(os.path.join(dirpath, fn), 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b''):
                md5hash.update(chunk)
    return md5hash.hexdigest()
