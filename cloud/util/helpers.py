import re
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist

from cms.models import AssetCustomizationReview, AssetType, cloud_portal_customization_cache, Language
from django.urls import reverse
from meilisearch import Client


def get_customization(request=None, /):
    if not request:
        return settings.CUSTOMIZATION

    if customization := getattr(request, 'data', request.POST).get('customization'):
        return customization

    return request.META.get('CUSTOMIZATION', settings.CUSTOMIZATION)


def get_meilisearch_client():
    return Client(settings.MEILISEARCH_ENDPOINT, settings.MEILISEARCH_MASTER_KEY)


def get_languages(customization=None, request=None):
    if not customization:
        customization = get_customization(request)

    return cloud_portal_customization_cache(customization, 'default_language'), \
        cloud_portal_customization_cache(customization, 'languages')


def detect_language_by_request(request):
    lang = None
    default_language, languages = get_languages(get_customization(request))

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
    return Language.objects.get(code=detect_language_by_request(request))


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
