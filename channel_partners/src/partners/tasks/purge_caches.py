from celery import shared_task
from django.core.cache import caches

from partners.utils.cache_keys import cache_key_channel_partner_structure


@shared_task
def purge_cache_for_channel_partners(channel_partner_ids):
    cache = caches['default']
    for cp_id in channel_partner_ids:
        cache_key = cache_key_channel_partner_structure(cp_id)
        cache.delete(cache_key)
