from html_sanitizer import Sanitizer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser

from api.helpers.exceptions import api_success
from cloud.utils import remove_suffix

from ..serializers import SanitizeHTMLSerializer


@api_view(['POST'])
@permission_classes([IsAdminUser])
def sanitize_html(request):
    serializer = SanitizeHTMLSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    html = serializer.validated_data['html']
    sanitizer = Sanitizer()

    # Handle sanitizer bug on 3.8 alpine
    sanitized_html = remove_suffix(sanitizer.sanitize(html), '</div></body></html>\n')
    return api_success({'sanitizedHTML': sanitized_html})
