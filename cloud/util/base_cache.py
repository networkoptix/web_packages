from django.conf import settings

from django.core.cache import caches
from django.core.cache.backends.base import InvalidCacheBackendError


class BaseCache(object):
    """Wraps document caching logic

    Class is initialized with cache_key and lookup_key kwargs.

    The lookup_key attribute can be mutated.
    This attribute is used to determine which item to get/set on the cache.

    The cache_key attribute can also be mutated.
    This attribute is used to determine which cache the docs are set/get to.
    Probably no reason to every mutate the cache_key.

    Setting global_clear on init marks that cache to be cleared on clear_global cache.
    """

    global_clear_cache_keys = {'documentation', 'agreement', 'article', 'integrations', 'menus', 'release_notes', 'readonly_apis'}
    cache_key = ''
    lookup_key = ''

    def __init__(self, cache_key='documentation', lookup_key=''):
        self.cache_key = cache_key
        self.lookup_key = lookup_key

    @staticmethod
    def generate_lookup_key(language, state, identifier='', version='latest'):
        draft = state == "draft"
        return f'{settings.CUSTOMIZATION}-{language.code}-{identifier}-{state}-{version if not draft else "latest"}'

    @classmethod
    def clear_global_cache(cls):
        for cache_key in cls.global_clear_cache_keys:
            caches[cache_key].clear()

    def get_cached_item(self):
        """Checks cache for doc using the lookup_key attribute.

        Returns:
            doc: returns cached doc or None if not in cache
        """
        return caches[self.cache_key].get(self.lookup_key, None)

    def set_cached_item(self, doc):
        """Sets doc to cache using the lookup_key attribute.

        Args:
            doc: Doc to be added to cache
        """
        caches[self.cache_key].set(self.lookup_key, doc)

    def clear_cache(self):
        caches[self.cache_key].clear()

    def __getitem__(self, lookup_key):
        return caches[self.cache_key].get(lookup_key, None)

    def __setitem__(self, lookup_key, doc):
        caches[self.cache_key].set(lookup_key, doc)
