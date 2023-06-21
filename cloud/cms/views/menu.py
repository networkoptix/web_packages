from uuid import uuid4
from django.http.request import QueryDict
from django.urls import reverse
from django.shortcuts import redirect
from rest_framework.permissions import AllowAny
from cms.feature_flags import FLAGS, check_feature_flag
import time
from cloud.helpers.exceptions import APINotFoundException, APIRequestException, ErrorCodes, api_success
from django.conf import settings

from dal import autocomplete
from rest_framework.decorators import api_view, permission_classes

from cms.models import Customization, Menu, MenuNode, ZendeskSyncLog, MenuCache
from cms.permissions import IsSuperuser



@api_view(("GET",))
@permission_classes((AllowAny,))
def get_menu(request, name):
    customization = request.CUSTOMIZATION
    menu_cache = MenuCache(customization_name=customization)
    cached = request.query_params.get('cached')
    current_version = menu_cache.get_cur_version()

    if not cached or not current_version or cached != current_version:
        if not current_version:
            current_version = menu_cache.set_new_version()
        return redirect(f'{reverse("get_menu", kwargs={"name": name})}?cached={current_version}')

    name = name.lower()
    cached_menus = menu_cache.get_customization_menus() or {}
    menu = cached_menus.get(name, None)
    if not menu:
        menu = Menu.generate_menu(menu_name=name, customization=customization)
        if menu:
            cached_menus = cached_menus or Menu.generate_menus(customization=customization)
            menu_cache.set_customization_menus({**cached_menus, name: menu})
        else:
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
