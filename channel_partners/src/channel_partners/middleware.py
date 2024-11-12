import waffle
from django.http import (
    HttpRequest,
    HttpResponse,
)


TEST_BROKEN_SWITCH = 'broken_service'


def broken_service_middleware(get_response):
    def middleware(request: HttpRequest):
        if not request.path.startswith('/partners/api') or not waffle.switch_is_active(TEST_BROKEN_SWITCH):
            return get_response(request)
        return HttpResponse(content=b'Broken Service Simulation', status=500)

    return middleware
