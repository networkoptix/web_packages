from api.helpers.exceptions import APINotFoundException, api_success
from django.conf import settings

from dal import autocomplete
from rest_framework.decorators import api_view, permission_classes

from cms.models import Menu, MenuNode
from cms.permissions import IsSuperuser


@api_view(("GET",))
@permission_classes((IsSuperuser,))
def get_menu(request, name):
    menu = Menu.generate_menu(menu_name=name)
    if not menu:
        raise APINotFoundException(f'Menu {name} not found')
    return api_success(menu)


class MenuNodeAutocomplete(autocomplete.Select2QuerySetView):
    def get_queryset(self):
        if self.request.user.is_superuser:
            parent = Menu.objects.get(id=self.forwarded.get('menu'))
            node_ids = parent.all_node_ids
            return MenuNode.objects.filter(id__in=node_ids, name__icontains=self.q)
        return MenuNode.objects.none()
