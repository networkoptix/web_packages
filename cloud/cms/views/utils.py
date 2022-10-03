from django.conf import settings
from django.contrib import admin
from django.contrib.auth.decorators import user_passes_test
from django.urls import reverse
from django.utils.decorators import method_decorator
from django.views.generic import FormView

from html_sanitizer import Sanitizer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser

from api.helpers.exceptions import api_success
from cloud.utils import remove_suffix

from ..forms import QASettingsForm
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


@method_decorator(user_passes_test(lambda user: user.is_superuser), name='dispatch')
class QASettings(FormView):
    form_class = QASettingsForm
    template_name = 'cms/qa_settings.html'

    def get_success_url(self):
        return reverse('qa_settings') if settings.DEBUG else reverse('admin:index')

    def get_context_data(self, **kwargs):
        return {
            **super().get_context_data(**kwargs),
            'conflicts': [],
            'user': self.request.user,
            'has_permission': admin.site.has_permission(self.request),
            'site_url': admin.site.site_url,
            'site_header': admin.site.site_header,
            'site_title': admin.site.site_title,
            'title': 'QA Settings'
        }

    def form_valid(self, form):
        form.update_cache()
        return super().form_valid(form)
