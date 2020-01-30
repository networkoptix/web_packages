from django.conf import settings as django_settings
from django.core.exceptions import ImproperlyConfigured
from django.core.cache import caches

from cms.models import Asset, AssetType
from push_notifications.conf.legacy import LegacyConfig


class empty(object):
    pass


class PushConfig(LegacyConfig):
    DEFAULT_SETTINGS = django_settings.PUSH_NOTIFICATIONS_SETTINGS
    PUSH_CONFIG_CACHE = caches['push_config']

    def _get_application_settings(self, application_id, settings_key, error_message):
        value = self._read_from_cache(application_id, settings_key) or self.DEFAULT_SETTINGS.get(settings_key, empty)
        if value is empty:
            raise ImproperlyConfigured(error_message)
        return value

    def _read_from_cache(self, application_id, settings_key):
        if not application_id:
            application_id = 'default'

        cached_settings = self.PUSH_CONFIG_CACHE.get('settings')
        if not cached_settings:
            cached_settings = {}
            for asset in Asset.objects.filter(asset_type__type=AssetType.ASSET_TYPES.cloud_portal):
                customization_name = asset.customizations.first().name
                asset_push_settings = asset.read_global_value('%PUSH_CONFIG%') or {}
                cached_settings[customization_name] = asset_push_settings

            if cached_settings:
                self.PUSH_CONFIG_CACHE.set('settings', cached_settings)

        return cached_settings.get(application_id, {}).get(settings_key, None)

