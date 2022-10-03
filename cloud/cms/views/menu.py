from django.http.request import QueryDict
from rest_framework.permissions import AllowAny
from cms.feature_flags import FLAGS, check_feature_flag
import time
from api.helpers.exceptions import APINotFoundException, APIRequestException, ErrorCodes, api_success
from django.conf import settings

from dal import autocomplete
from rest_framework.decorators import api_view, permission_classes

from cms.models import MENU_CACHE, Customization, Menu, MenuNode, ZendeskSyncLog
from cms.permissions import IsSuperuser


@api_view(("GET",))
@permission_classes((AllowAny,))
def get_menu(request, name):
    customization = settings.CUSTOMIZATION
    name = name.lower()
    cached_menus = MENU_CACHE[customization] or {}
    menu  = None

    if request.user.is_superuser or not (menu := cached_menus.get(name, None)):
        menu = Menu.generate_menu(menu_name=name)
        if menu:
            cached_menus = cached_menus or Menu.generate_menus(customization)
            MENU_CACHE[customization] = {**cached_menus, name: menu}


    if not menu:
        raise APINotFoundException(f'Menu {name} not found')

    return api_success(menu)

@api_view(['POST'])
@permission_classes((IsSuperuser,))
@check_feature_flag(FLAGS.zendesk_sync)
def menu_force_sync(request):
    from cms.controllers.zendesk import sync_menu

    menu_id = request.data.get('menu_id')
    menu = Menu.objects.filter(id=menu_id).first()
    customizations = request.data.get('customizations')
    if not menu_id:
        raise APIRequestException(f'Payload must contain menu_id property', ErrorCodes.wrong_parameters)
    if not menu:
        raise APINotFoundException(f'Menu menu_id {menu_id} not found')
    if customizations:
        customization_names = [customizations] if isinstance(customizations, str) else customizations
        customizations = list(Customization.objects.filter(name__in=customization_names))
    for _ in sync_menu(menu, customizations):
        # TODO: Will probably need to take the taskId and use it for tracking status
        pass
    return api_success(f'Menu syncing started for {menu.name} for {[customization.name for customization in customizations] if customizations else "All" } customizations ')


@api_view(['POST'])
@permission_classes((IsSuperuser,))
@check_feature_flag(FLAGS.zendesk_sync)
def menu_cancel_sync(request):
    log_id = request.data.get('log_id', None)
    sync_log = ZendeskSyncLog.objects.filter(id=log_id).first()
    if not log_id:
        raise APIRequestException(f'Payload must contain menu_id property', ErrorCodes.wrong_parameters)
    if not sync_log:
        raise APINotFoundException(f'Sync log with log_id {log_id} not found')

    ZendeskSyncLog.cancel_existing_sync(log_id)

    return api_success(f'Syncing canceled for {log_id}')


@api_view(['POST'])
@permission_classes((IsSuperuser,))
@check_feature_flag(FLAGS.zendesk_sync)
def menu_clean_zd(request):
    from cms.controllers.zendesk import ZendeskMapper
    data = request.data.dict() if isinstance(request.data, QueryDict) else request.data
    customization = data.pop('customization', '')
    mapper = ZendeskMapper(customization_name=customization)
    mapper.clean_zd(data)
    return api_success('Cleaning Zendesk started')


class MenuNodeAutocomplete(autocomplete.Select2QuerySetView):
    def get_queryset(self):
        if self.request.user.is_superuser:
            parent = Menu.objects.get(id=self.forwarded.get('menu'))
            node_ids = parent.all_node_ids
            return MenuNode.objects.filter(id__in=node_ids, name__icontains=self.q)
        return MenuNode.objects.none()
