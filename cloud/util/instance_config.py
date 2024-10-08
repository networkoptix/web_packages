import hashlib
import os
import structlog
import sys
import yaml

logger = structlog.getLogger(__name__)


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
        logger.critical("File does not exist", filepath=file_path)
        raise UnableToFetchConfigException(f"Something went wrong as soon as file {file_path} does not exist.")
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


class CloudType:
    private_1 = 'private-1'


class CmsConfig:

    _allowed_models = {
        CloudType.private_1: [
            'api.account',
            'api.proxygroup',
            'api.accountloginhistory',
            'cms.asset',
            'cms.assetcustomizationreview',
        ]
    }

    def __init__(self):
        from django.conf import settings
        self._value = settings.CMS_CONFIG

    @property
    def value(self) -> str:
        return self._value

    @property
    def is_private_1(self) -> bool:
        return self.value == CloudType.private_1

    @property
    def allowed_models(self) -> list:
        return self._allowed_models.get(self.value)

    def unregister_forbidden(self):
        if self.allowed_models is None:
            return
        from django.contrib import admin

        def model_name(model):
            return f'{model._meta.app_label.lower()}.{model._meta.model_name.lower()}'

        _models = list(admin.site._registry.keys())
        for _model in _models:
            if model_name(_model) not in self.allowed_models:
                logger.info("unregistering_model_admin", data_structure=model_name(_model))
                admin.site.unregister(_model)