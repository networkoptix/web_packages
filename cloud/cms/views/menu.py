from api.helpers.exceptions import APINotFoundException, api_success
from django.conf import settings

from rest_framework.decorators import api_view, permission_classes

from cms.models import Menu
from cms.permissions import IsSuperuser


@api_view(("GET",))
@permission_classes((IsSuperuser,))
def get_menu(request, name):
    menu = Menu.generate_menu(menu_name=name)
    if not menu:
        raise APINotFoundException(f'Menu {name} not found')
    return api_success(menu)