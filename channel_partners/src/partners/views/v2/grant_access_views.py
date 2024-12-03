from typing import List

from django.conf import settings
from django.http import HttpResponseForbidden
from django.shortcuts import render
from drf_spectacular.utils import extend_schema
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from partners.forms.grant_access_form import GrantAccessForm
from partners.serializers.v2.serializers import (
    GrantAccessResponseSerializer,
    GrantAccessSerializer,
)
from partners.services.internal_grant_access_service import (
    CustomizationUsers,
    InternalGrantAccessService,
)
from tools.versioning.decorators import version_range
from tools.versioning.utils import Versions
from tools.versioning.views import VersionedViewMixin


def grant_access(request):
    if not settings.DEBUG:
        return HttpResponseForbidden()
    form: GrantAccessForm = GrantAccessForm(request.POST or None)
    grant_service = InternalGrantAccessService()
    if not grant_service.root_partner or not grant_service.customizations:
        return render(request,
                      'grant_access_error.html',
                      {'root_partner': grant_service.root_partner,
                       'customizations': grant_service.customizations})

    if request.method == 'POST' and form.is_valid():

        email: str = form.cleaned_data.get("email")
        result: List[CustomizationUsers] = grant_service.new_process(email)

        context = {'form': form, 'result': result, 'submitted': True}
        # Refreshing the resulting page leads to resubmitting form.
        # But, it is not a problem here. Just because it generates the same result.
        return render(request, 'grant_access.html', context)

    return render(request,
                  template_name='grant_access.html',
                  context={'form': form, 'customizations': grant_service.customizations})


@version_range(versions=Versions(min_version='v2'))
@extend_schema(tags=['Internal'], description='Grant user access to all customizations.')
class GrantAccessView(VersionedViewMixin, GenericViewSet):
    serializer_class = GrantAccessSerializer

    @extend_schema(
        request=GrantAccessSerializer,
        responses={200: GrantAccessResponseSerializer(many=True)})
    def create(self, request):
        if not settings.DEBUG:
            return Response(status=404)
        grant_service = InternalGrantAccessService()
        if not grant_service.root_partner or not grant_service.customizations:
            raise ValidationError(detail="There is no root partner or customizations")
        serializer = GrantAccessSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        grant_service = InternalGrantAccessService()
        result: List[CustomizationUsers] = grant_service.new_process(email)
        return Response(GrantAccessResponseSerializer(result, many=True).data)

