import logging
import os
import re
from functools import wraps
from logging import getLogger
from mimetypes import guess_type

import waffle
from asgiref.sync import sync_to_async
from django.conf import settings
from django.http import HttpResponse, Http404
from django.shortcuts import redirect
from django.views.static import serve

from cloud.helpers.exceptions import APINotFoundException
from cms.controllers.static_files import get_template, get_customizable_static
from cms.models import get_cloud_portal_asset, Asset, AssetType

logger = getLogger(__name__)


def server_dev_static(view):
    """
    Decorator must mimic nginx behavior. If 404 received then file
    must be served from local filesystem.

    """
    @wraps(view)
    async def wrapped(request, *args, **kwargs):
        if not os.getenv('LOCAL_ENV', False):
            return await view(request, *args, **kwargs)

        path = re.sub(rf'^{settings.STATIC_URL}', '', request.path)
        response = await view(request, *args, **kwargs)
        if response.status_code != 404:
            return response
        latest = None
        for dir in settings.STATICFILES_DIRS:
            try:
                response = serve(request, path, document_root=dir)
            except Http404 as ex:
                latest = ex
                continue
            return response
        if latest:
            raise latest
    return wrapped


@server_dev_static
async def customizable_files(request, *args):
    """
    Return file content from DB or 404 if it does not exist. Flag must be enabled.
    Args:
        request:

    """
    static_path = re.sub(r'^/', '', request.path)
    content = await get_customizable_static(request.CUSTOMIZATION, static_path)
    if content is None:
        logger.info(f'Empty content for {static_path}')
        return HttpResponse(status=404)
    content_type, encoding = guess_type(static_path)
    logger.info(f'Serving content for {static_path}')
    return HttpResponse(content=content, content_type=content_type)


async def get_template_response(request, filename, language_code=None):
    template = await get_template(request, filename, language_code=language_code)
    content_type, encoding = guess_type(filename)
    logger.info(f'Serving template from DB. {filename}')
    return HttpResponse(template, content_type=content_type)


@server_dev_static
async def language_template(request, filename, language_code=None):
    """
    Handler returns response with a compiled template file. If feature enabled
    file MUST exist in a DB, otherwise error raised.
    Args:
        request: request object
        filename: filename without path
        language_code: language code

    Returns:

    """
    filename = f'static/lang_{{{{language}}}}/{filename}'
    return await get_template_response(request, filename, language_code=language_code)


@server_dev_static
async def static_template(request):
    """
    Handler returns response with a compiled template file. If feature enabled
    file MUST exist in a DB, otherwise error raised.
    Args:
        request: request object
        filename: filename without path

    Returns:

    """
    filename = re.sub(r'^/', '', request.path)
    return await get_template_response(request, filename)


async def skin_styles(request):
    cloud_portal = await Asset.objects.filter(customizations__name__in=[request.CUSTOMIZATION], asset_type__name="",
                                              asset_type__type=AssetType.ASSET_TYPES.cloud_portal).afirst()
    if not cloud_portal:
        raise APINotFoundException(f"Customization {request.CUSTOMIZATION} not found.")
    skin = await sync_to_async(cloud_portal.read_global_value)('%SKIN%')
    redirect_url = f'/static/skin/{skin}/skin.css'
    return redirect(redirect_url)


async def skin_style(request, skin):
    """
    For local usage only. Returns style for current skin
    """
    styles_dir = os.path.join(settings.STATIC_LOCATION, f'_source/{skin}/static/styles')
    return serve(request, 'skin.css', document_root=styles_dir)