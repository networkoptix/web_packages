
from django.apps import AppConfig
from django.core.cache import caches

from channel_partners.utils import generate_path_to_tags_mapping


class PartnersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'partners'

    def ready(self):
        tag_mappings: dict[str, str] = generate_path_to_tags_mapping()
        caches['local'].set_many(tag_mappings)
