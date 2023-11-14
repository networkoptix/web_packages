import re
from typing import Type

import httpx
from asgiref.sync import async_to_sync
from django.conf import settings
from django.core.cache import caches
from django.core.exceptions import ObjectDoesNotExist

from cloud.customization_context import customization_ctx
from cms.helpers.cached_asset import CustomizationCache
from cms.models import cloud_portal_customization_cache, Language, Customization, cloud_portal_customization_cache_async
from django.urls import reverse
from meilisearch import Client


def get_cloud_host_map():
    assets_cache = caches['assets_values']
    cloud_host_map = assets_cache.get('cloud_host_map')
    if not cloud_host_map:
        customizations = Customization.objects.all().values('host', 'additional_hosts', 'name')
        cloud_host_map = {}
        for cust in customizations:
            if cust['host']:
                cloud_host_map[cust['host']] = cust['name']
            cloud_host_map.update({host: cust['name'] for host in cust['additional_hosts'] if host})
        assets_cache.set('cloud_host_map', cloud_host_map, timeout=3600)  # 1 hour timeout
    return cloud_host_map


def get_customization_name_from_cloud_host(hostname):
    cloud_host_map = get_cloud_host_map()
    return cloud_host_map.get(hostname)


def get_cloud_host_by_customization(customization: str):
    return get_cached_customization(customization).host


def get_cached_customization(customization: str) -> Customization:
    cache = CustomizationCache(customization_name=customization)
    if customization_object := cache.get_value():
        return customization_object
    customization_object = Customization.objects.get(name=customization)
    cache.save_value(customization_object)
    return customization_object


def get_meilisearch_client():
    return Client(settings.MEILISEARCH_ENDPOINT, settings.MEILISEARCH_MASTER_KEY)


def get_languages(customization=None, request=None):
    if not customization:
        customization = getattr(request, 'CUSTOMIZATION', customization_ctx.get())

    return async_to_sync(default_and_all_languages)(customization)


async def default_and_all_languages(customization):
    # it's better to call caches one-by-one than concurrently because of using lock in there
    return await cloud_portal_customization_cache_async(customization, 'default_language'), \
        await cloud_portal_customization_cache_async(customization, 'languages')


def detect_language_by_request(request):
    lang = None
    default_language, languages = get_languages(request.CUSTOMIZATION)

    # 1. Try account value - top priority
    if request.user.is_authenticated:
        lang = request.user.language

    # 2. try session value
    if not lang:
        lang = request.session.get('language', None)

    # 3. Try cookie value (saved in browser some time ago)
    if not lang:
        if 'language' in request.COOKIES:
            lang = request.COOKIES['language']

    # 4. Try ACCEPT_LANGUAGE header
    if not lang and 'HTTP_ACCEPT_LANGUAGE' in request.META:
        # "en-US,en;q=0.9" -> ["en-Us, en", "q=0.9"] -> "en-Us, en" -> ["en-Us", "en"]
        request_languages = request.META['HTTP_ACCEPT_LANGUAGE'].split(';')[
            0].split(',')
        for l in request_languages:
            if l in languages:
                lang = l
                break

    if not lang or lang not in languages:  # not supported language
        lang = default_language  # return default
    return lang.replace('-', '_')


def get_language_object_from_request(request):
    code = detect_language_by_request(request)
    return Language.by_code(code)


def get_language_for_email(email, customization):
    from api.models import Account
    default_language, languages = get_languages(customization)

    try:
        language = Account.objects.get(email=email).language
    except ObjectDoesNotExist:
        language = default_language

    if not language or language not in languages:
        language = default_language

    return language


def get_admin_url(obj_instance):
    """Accepts an object instance and returns the admin url for it.

    Args:
        obj_instance : Accepts a object to get admin url

    Returns:
        string: Admin Url
    """
    return reverse(f'admin:{obj_instance._meta.app_label}_{obj_instance._meta.model_name}_change',
                   args=[obj_instance.id])


def substitute_branding(repl_dict, text):
    if not text:
        return ''
    # Searches for any the keys from replacement dict
    # When one is found, the lambda function returns the value for that key and it is used as the replacement
    return re.sub("|".join(repl_dict.keys()), lambda match: repl_dict[re.escape(match.group(0))], text)



class HttpxAsyncRequest:
    @staticmethod
    async def get(*args, request_timeout=60, **kwargs):
        async with httpx.AsyncClient(timeout=request_timeout) as client:
            response = await client.get(*args, **kwargs)
        return response

    @staticmethod
    async def patch(*args, **kwargs):
        async with httpx.AsyncClient() as client:
            response = await client.patch(*args, **kwargs)
        return response

    @staticmethod
    async def put(*args, **kwargs):
        async with httpx.AsyncClient() as client:
            response = await client.put(*args, **kwargs)
        return response

    @staticmethod
    async def post(*args, **kwargs):
        async with httpx.AsyncClient() as client:
            response = await client.post(*args, **kwargs)
        return response

    @staticmethod
    async def delete(*args, **kwargs):
        async with httpx.AsyncClient() as client:
            response = await client.delete(*args, **kwargs)
        return response
