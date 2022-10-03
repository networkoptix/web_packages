from django.conf import settings
import requests
from django.http import HttpResponse

def serve_static(request, static_path):
    """Strips content disposition and other headers from response for serving uploaded content such as html pages
    """
    res = requests.get(f'https://{settings.AWS_S3_CUSTOM_DOMAIN}/{static_path}')
    content_type = res.headers['content-type']
    return HttpResponse(res.content, status=res.status_code, content_type=content_type)
