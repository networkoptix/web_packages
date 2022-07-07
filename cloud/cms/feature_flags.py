from enum import Enum
import functools
from django.core.handlers.wsgi import WSGIRequest
from waffle import get_waffle_flag_model

from rest_framework.request import Request


class_builtins = object.__dict__.keys()


class _FlagType(type):
    def __getattribute__(self, name):
        attr = super().__getattribute__(name)
        if name not in class_builtins and not name.startswith('_') and not name.endswith('_') and type(attr) is tuple:
            return attr[0]
        return attr

    def __getitem__(self, item):
        if item not in class_builtins and type(item) is str and not item.startswith('_') and not item.endswith('_'):
            attr = super().__getattribute__(item)
            if type(attr) is tuple:
                return attr[0]
        raise KeyError(item)

    @property
    def all_keys(self):
        return [
            key for key, item in self.__dict__.items()
            if key not in class_builtins and not key.startswith('_') and not key.endswith('_') and type(item) is tuple
        ]

    def json_key(self, name):
        attr = super().__getattribute__(name)
        return attr[1]

    def value_to_key(self, value):
        for key in self.all_keys:
            if value in super().__getattribute__(key):
                return key
        return None

    def data_structure_name(self, name):
        attr = super().__getattribute__(name)
        return attr[2] if len(attr) >= 3 else ''


class FLAGS(metaclass=_FlagType):
    # python_name = ('Human-readable and actual name', 'jsonKey', 'global_data_structure')
    custom_clients = ('Custom Clients', 'customClients',
                      '%PUBLIC_CUSTOM_CLIENTS%')
    zendesk_sync = ('Zendesk Sync', 'zendeskSync', '%ZENDESK_SYNC%')
    alexa_integration = ('Alexa Integration',
                         'alexaIntegration', '%ALEXA_INTEGRATION_ENABLED%')
    bookmarks = ('View Bookmarks', 'bookmarks', '%BOOKMARKS_ENABLED%')
    dashboard = ('Dashboard', 'dashboard', '%DASHBOARD_ENABLED%')
    dashboard_redirect = ('Dashboard Redirect', 'dashboardRedirect', '%DASHBOARD_REDIRECT_ENABLED%')
    archive_selection = ('Archive Selection', 'archiveSelection', '%ARCHIVE_SELECTION_ENABLED%')
    view_camera_details = ('View Camera Details', 'viewCameraDetails', '%VIEW_CAMERA_DETAILS_ENABLED%')
    themes_enabled = ('Enable themes', 'themesEnabled', '%THEMES_ENABLED%')
    cloud_ownership_transfer = ('Cloud Ownership Transfer', 'cloudOwnershipTransfer', '%CLOUD_OWNERSHIP_TRANSFER%')
    new_header = ('New Header', 'newHeader')
    cloud_storage = ('Cloud Storage', 'cloudStorage', '%CLOUD_STORAGE_FEATURE_ENABLED%')
    log_rocket = ('Log Rocket', 'logRocket', '%LOGROCKET_ENABLED%')

    # TODO: Remove this with https://networkoptix.atlassian.net/browse/CLOUD-8667 *********
    five_r = ('Paginator(experimental)', 'paginatorExperimental', '%FIVE_R_ENABLED%')
    # *************************************************************************************

    def __getattribute__(self, name):
        return dict(FLAGS).get(name)


class SWITCHES(metaclass=_FlagType):
    landing_page = ('Landing Page', 'landingPage')
    kb_instant_search = ('KnowledgeBase Instant Search', 'kbInstantSearch')
    server_side_meta = ('Server Side Metadata', 'serverSideMetadata')
    system_groups = ('System Groups', 'systemGroups')
    readonly_apis = ('Readonly APIs', 'readonlyAPIs')


class SAMPLES(metaclass=_FlagType):
    pass

# Helpers


ERROR_CHECKING_REQUEST = 'Some error occurred when checking request'
ERROR_ONLY_SUPERUSERS = 'This feature is only allowed for superusers'


def get_request_argument(*args, **kwargs):
    request_types = (WSGIRequest, Request)
    request_argument = req_from_kwargs if (req_from_kwargs := kwargs.get('request', False)) and isinstance(
        req_from_kwargs, request_types) else next((arg for arg in args if isinstance(arg, request_types)), None)
    if request_argument is None:
        raise PermissionError(ERROR_CHECKING_REQUEST)
    return request_argument


def validate_is_superuser(*args, **kwargs):
    """Validator for use with check_feature_flag. Returns error string if not superuser.

    Returns:
        [ERROR_ONLY_SUPERUSERS | False]: Returns error string if not superuser
    """
    request = get_request_argument(*args, **kwargs)
    if not request.user.is_superuser:
        return ERROR_ONLY_SUPERUSERS
    return False


def get_feature_flag_error(flag, user):
    return f'Feature {flag} is currently not enabled for user {user}'


def flag_is_active_for_user(user, flag_name, overrides=None):
    flag = get_waffle_flag_model().get(flag_name)
    return flag.is_active_for_user(user, overrides)


def check_feature_flag(flags, custom_validator=None, error_class=PermissionError):
    """Decorator that wraps and adds some additional functionality to flag_is_active. Can be applied to either functions or methods, it will check for either a kwarg reqest, or the first arg that's a request.

    Args:
        flags (FLAGS): Feature flag to check against request. Could either accept a single flag or a list of flags
        custom_validator (function, optional): Optionally accepts function to run custom validation in addition to checking flags. Should error message if validation failed. Defaults to None.
        error_class ([Exception], optional): Exception to raise if either flag is not active or custom_validator returns False. Defaults to PermissionError.
    """

    def flag_checker(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            from waffle import flag_is_active

            request = get_request_argument(*args, **kwargs)
            flags_to_check = [flags] if isinstance(flags, str) else flags
            for flag in flags_to_check:
                if not flag_is_active(request, flag):
                    raise error_class(
                        get_feature_flag_error(flag, request.user))
            else:
                if custom_validator and (validator_message := custom_validator(*args, **kwargs)):
                    raise error_class(validator_message)

            return func(*args, **kwargs)

        return wrapper

    return flag_checker
