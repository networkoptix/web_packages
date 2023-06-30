from django.conf import settings

from django.core.cache import caches
from django.core.exceptions import ImproperlyConfigured

from cloud.customization_context import customization_ctx

from cloud.helpers.exceptions import ErrorCodes, APIInternalException

from cloud.helpers.exceptions import APIRequestException, ErrorCodes, APIInternalException

from cloud.helpers.exceptions import APIRequestException, ErrorCodes, APIInternalException


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
    def generate_lookup_key(language, state, identifier='', version='latest', *, customization_name=None, request=None):
        if not customization_name and not request and not customization_ctx.get():
            raise APIInternalException('Customization must be given.',
                                       error_code=ErrorCodes.no_customization_given)
        customization_name = customization_name or getattr(request, 'CUSTOMIZATION', customization_ctx.get())
        draft = state == "draft"
        return f'{customization_name}-{language.code}-{identifier}-{state}-{"latest" if draft else version}'

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

    async def aget_cached_item(self):
        """Checks cache for doc using the lookup_key attribute.

        Returns:
            doc: returns cached doc or None if not in cache
        """
        return await caches[self.cache_key].aget(self.lookup_key, None)

    def set_cached_item(self, doc):
        """Sets doc to cache using the lookup_key attribute.

        Args:
            doc: Doc to be added to cache
        """
        caches[self.cache_key].set(self.lookup_key, doc)

    async def aset_cached_item(self, doc):
        """Sets doc to cache using the lookup_key attribute.

        Args:
            doc: Doc to be added to cache
        """
        await caches[self.cache_key].aset(self.lookup_key, doc)

    def clear_cache(self):
        caches[self.cache_key].clear()

    def __getitem__(self, lookup_key):
        return caches[self.cache_key].get(lookup_key, None)

    def __setitem__(self, lookup_key, doc):
        caches[self.cache_key].set(lookup_key, doc)


class BaseCacheV2(object):
    """Wraps document caching logic

    Class is initialized with cache_key and lookup_key kwargs.

    The lookup_key can be set by keyword argument or generated in `get_lookup_key()` method.
    This attribute is used to determine which item to get/set on the cache.

    The cache_key attribute is required can be set in subclass definition or in `cache_key`
    keyword argument dynamically.
    This attribute is used to determine which cache the docs are set/get to.

    Customization name can be passed in same name kwarg or within request object. To disable
    customization name validation use `customization_required` kwarg. Default is True.
    """

    global_clear_cache_keys = {'documentation', 'agreement', 'article', 'integrations', 'menus', 'release_notes', 'readonly_apis'}
    _cache_key: str = None
    _lookup_key: str = None
    _customization_required: bool = True

    def __init__(self, lookup_key: str = None, customization_name: str = None, request=None, **kwargs):

        self._cache_key = kwargs.get('cache_key') or self._cache_key
        if not self._cache_key:
            raise ImproperlyConfigured("'cache_key' must be set in class definition or keyword argument.")

        self._customization_required = kwargs.get('customization_required', self._customization_required)
        self.customization_name = self.get_customization_name(
            customization_name=customization_name, request=request
        )
        if self._customization_required and not self.customization_name:
            raise APIInternalException('Customization must be given.',
                                       error_code=ErrorCodes.no_customization_given)
        if lookup_key is not None:
            self._lookup_key = lookup_key
        if self.lookup_key is None:
            raise ImproperlyConfigured("'lookup_key' must be set in class definition `_lookup_key`, keyword argument "
                                       "or generated by `self.get_lookup_key()` method.")

    def get_customization_name(self, customization_name=None, request=None):
        return customization_name or getattr(request, 'CUSTOMIZATION', customization_ctx.get())

    def get_lookup_key(self):
        return self._lookup_key

    @property
    def lookup_key(self):
        return self.get_lookup_key()

    @property
    def cache(self):
        return caches[self._cache_key]

    @classmethod
    def clear_global_cache(cls):
        for cache_key in cls.global_clear_cache_keys:
            caches[cache_key].clear()

    def get_cached_item(self):
        """Checks cache for doc using the lookup_key attribute.

        Returns:
            doc: returns cached doc or None if not in cache
        """
        return self.cache.get(self.lookup_key, None)

    async def aget_cached_item(self):
        """Checks cache for doc using the lookup_key attribute.

        Returns:
            doc: returns cached doc or None if not in cache
        """
        return await self.cache.aget(self.lookup_key, None)

    def set_cached_item(self, doc, timeout=None):
        """Sets doc to cache using the lookup_key attribute.

        Args:
            doc: Doc to be added to cache
            timeout: cache key ttl
        """
        kwargs = {}
        if timeout is not None:
            kwargs['timeout'] = timeout
        self.cache.set(self.lookup_key, doc)

    async def aset_cached_item(self, doc, timeout=None):
        """Sets doc to cache using the lookup_key attribute.

        Args:
            doc: Doc to be added to cache
            timeout: cache key ttl
        """
        kwargs = {}
        if timeout is not None:
            kwargs['timeout'] = timeout
        await self.cache.aset(self.lookup_key, doc, **kwargs)

    def clear_cache(self):
        self.cache.clear()

    def __getitem__(self, lookup_key):
        return self.cache.get(lookup_key, None)

    def __setitem__(self, lookup_key, doc):
        self.cache.set(lookup_key, doc)


class ReadOnlyAPICache(BaseCacheV2):
    _cache_key = 'readonly_apis'
    _customization_required = False

    def __init__(self, api_id, *args, **kwargs):
        self.api_id = api_id
        super().__init__(*args, **kwargs)

    def get_lookup_key(self):
        return f'readonlyapi-{self.api_id}'


class IntegrationCache(BaseCacheV2):
    _cache_key = 'integrations'
    _customization_required = True

    def __init__(self, language=None, state: str = None, identifier=None, version='latest',
                 customization_name=None, request=None, **kwargs):
        self.language_code: str = language if isinstance(language, str) else language.code
        self.state = state
        self.identifier = identifier
        self.version = version
        super().__init__(customization_name=customization_name, request=request, **kwargs)

    def get_lookup_key(self):
        draft = self.state == "draft"

        return f'{self.customization_name}-{self.language_code}-{self.identifier}-' \
               f'{self.state}-{"latest" if draft else self.version}'


class ReleaseNotesCache(IntegrationCache):
    _cache_key = 'release_notes'


class AgreementCache(IntegrationCache):
    _cache_key = 'agreement'


class ArticleCache(IntegrationCache):
    _cache_key = 'article'


class HashCache:
    _cache_name: str = None
    _timeout = 86400 * 10

    def __init__(self, hash_key: str, field_key: str, cache_name: str = None):
        self.hash_key = hash_key
        self.field_key = field_key
        self.cache_name = cache_name or self._cache_name
        self.cache = caches[self.get_cache_name()]

    def get_cache_name(self):
        return self.cache_name

    def set_value(self, value):
        self.cache.hset(self.hash_key, self.field_key, value)
        self.set_timeout()

    def set_timeout(self):
        self.cache.touch(self.hash_key, timeout=self._timeout)

    def get_value(self):
        return self.cache.hget(self.hash_key, self.field_key)
