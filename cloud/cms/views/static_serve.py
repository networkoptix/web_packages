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
from django.views.static import serve
from cms.controllers.static_files import get_template, get_customizable_static
from cms.feature_flags.feature_flags import FLAGS

logger = getLogger(__name__)


async def is_db_static_enabled(request) -> bool:
    if await sync_to_async(waffle.flag_is_active)(request, FLAGS.s3_static) \
            or not await sync_to_async(waffle.flag_is_active)(request, FLAGS.db_static):
        return False
    return True


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
        for dir in settings.STATICFILES_DIRS:
            try:
                response = serve(request, path, document_root=dir)
            except Http404 as ex:
                continue
            return response
        raise ex

    return wrapped



@server_dev_static
async def customizable_files(request, *args):
    """
    Return file content from DB or 404 if it does not exist. Flag must be enabled.
    When s3 static feature is enabled static files must be requested by `/media` path
    and routed to s3 in nginx. If file is not uploaded to s3 then it can be accessed
    by nginx locally on this handler failure with 404
    Args:
        request:

    """
    if not await is_db_static_enabled(request):
        logger.info(f'Feature is not enabled')
        return HttpResponse(status=404)
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
    file MUST exist in a DB, otherwise error raised. If feature is not enabled
    it returns 404 which signals nginx to loop up for file in local files.
    Same behavior is followed in local development excepting errors are handled
    by server_dev_static decorator.
    Args:
        request: request object
        filename: filename without path
        language_code: language code

    Returns:

    """
    if not await sync_to_async(waffle.flag_is_active)(request, FLAGS.db_static):
        logger.info(f'Feature is not enabled')
        return HttpResponse(status=404)
    filename = f'static/lang_{{{{language}}}}/{filename}'
    return await get_template_response(request, filename, language_code=language_code)


@server_dev_static
async def static_template(request):
    """
    Handler returns response with a compiled template file. If feature enabled
    file MUST exist in a DB, otherwise error raised. If feature is not enabled
    it returns 404 which signals nginx to loop up for file in local files.
    Args:
        request: request object
        filename: filename without path

    Returns:

    """
    if not await sync_to_async(waffle.flag_is_active)(request, FLAGS.db_static):
        logger.info(f'Feature is not enabled')
        return HttpResponse(status=404)
    filename = re.sub(rf'^/', '', request.path)
    return await get_template_response(request, filename)
