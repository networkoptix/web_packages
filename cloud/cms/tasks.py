import json
from celery import shared_task, current_task
from celery.exceptions import Ignore
from django.core.exceptions import PermissionDenied

from cms.controllers import filldata, generate_structure, structure, structure_to_html
from api.models import Account
from cms.models import Asset, Menu, PackagesCache, UserGroupsToAssetPermissions, CustomClient
from celery.result import AsyncResult

PACKAGE_CACHE = PackagesCache()


class TaskErrors(Exception):
    def __init__(self, errors):
        self.errors = errors
        super().__init__(errors)


def get_package_cache_key(asset: Asset, preview=None, version_id=None, structure_format=None):
    cache_key = f"{asset.id}-{version_id or asset.version_id()}"
    if preview:
        cache_key += "-preview"
    if structure_format:
        cache_key += f'-{structure_format}'
    return cache_key


@shared_task
def make_package(asset_id, preview, version_id):
    def update_progress(current, total):
        current_task.update_state(state='PROGRESS',
            meta={'current': current, 'total': total})

    asset = Asset.objects.get(id=asset_id)
    cache_key = get_package_cache_key(asset, preview, version_id)

    zip_package = filldata.PackageExporter(asset, preview, version_id, update_progress_cb=update_progress).get_zip_package()
    PACKAGE_CACHE[cache_key] = {"file": zip_package, "is_ready": True}


def get_custom_client_package_key(custom_pk, download_id):
    return f'custom-client-{custom_pk}-{download_id}'


@shared_task
def make_custom_client(custom_client_id, download_id):
    def update_progress(current, total):
        current_task.update_state(state='PROGRESS',
                                  meta={'current': current, 'total': total})

    custom_client = CustomClient.objects.get(id=custom_client_id)
    cache_key = get_custom_client_package_key(custom_client_id, download_id)

    custom_data, errors = filldata.calculate_custom_client_data(custom_client)
    if errors:
        current_task.update_state(
            state='ERROR', meta={'errors': errors}
        )
        raise TaskErrors(errors)
    zip_package = filldata.PackageExporter(
        asset=custom_client.base_vms, preview=False, update_progress_cb=update_progress,
        custom=True, custom_data=custom_data
    ).get_zip_package()
    PACKAGE_CACHE[cache_key] = {"file": zip_package, "is_ready": True, 'task_id': str(current_task.request.id)}


@shared_task
def make_structure(user_id, output_format='json', use_actual_values=True, asset_type=None, asset_id=None):
    from cms.views.asset import prepare_asset_exports

    def update_progress(current, total):
        current_task.update_state(state='PROGRESS',
            meta={'current': current, 'total': total})
    def update_complete(file_name, content):
        PACKAGE_CACHE[make_structure.request.id] = {"file": content, "file_name": file_name, "is_ready": True}

    data = []
    assets = list(Asset.objects.filter(asset_type__type=asset_type) if asset_type is not None else Asset.objects.filter(id=asset_id))
    total = len(assets)
    if not total:
        current_task.update_state(state='FAILED', meta={'current': 0, 'total': total, 'errors': ['No Assets to export']})
        return

    user = Account.objects.get(pk=user_id)

    update_progress(0, total)
    for current, asset in enumerate(assets):
        if not UserGroupsToAssetPermissions.check_asset_edit_content(user, asset):
            if asset_id:
                raise PermissionDenied
            continue
        update_progress(current, total)
        asset_dict = generate_structure.from_database(asset, use_actual_values)[0]
        asset_dict['name'] = asset.name
        asset_dict['uuid'] = str(asset.uuid)
        asset_dict['customizations'] = [customization.name for customization in asset.customizations.all()]
        prepare_asset_exports(asset, asset_dict)
        data.append(asset_dict)
    update_progress(total, total)
    single_html_asset = not asset_type and output_format == "html"
    file_name = f"{assets[0].asset_type}-all-structures.json" if asset_type is not None else f"{data[0]['name']}-structure.{output_format}"

    content = structure_to_html.process_structure_json(data[0]) if single_html_asset else json.dumps(data, ensure_ascii=False, indent=4, separators=(',', ': '))
    update_complete(file_name.replace(" ", "_"), content)


@shared_task
def async_import_assets_from_json(json_cache_id, user_id, publish=False):
    assets_list = PACKAGE_CACHE.get(json_cache_id)
    user = Account.objects.get(pk=user_id)
    current = 0
    total = len(assets_list)
    def update_progress(error = None):
        nonlocal current
        task = async_import_assets_from_json.AsyncResult(async_import_assets_from_json.request.id)
        errors = task.result.get('errors', []) if task.result is not None else []
        if error:
            errors.append(error)
        current += 1
        current_task.update_state(state='PROGRESS',
            meta={'current': current, 'total': total, 'errors': errors})
    structure.import_assets_from_json(assets_list, user, publish=publish, increment_progress=update_progress)


@shared_task
def async_menu_import(cache_key, menu_name, user_email, accept_reviews=False):
    menu_dict = PACKAGE_CACHE[cache_key]
    menu = Menu.objects.get(name=menu_name)
    user = Account.objects.get(email=user_email)
    def update_progress(current, total, error = None):
        task = async_menu_import.AsyncResult(async_menu_import.request.id)
        errors = task.result.get('errors', []) if task.result is not None else []
        if error:
            errors.append(error)
        current_task.update_state(state='PROGRESS',
            meta={'current': current, 'total': total, 'errors': errors})
    menu.from_dict(menu_dict, user, update_progress_cb=update_progress, accept_reviews=accept_reviews)

@shared_task
def async_menu_export(menu_name):
    from cms.admin import MenuAdmin
    def update_progress(current, total):
        current_task.update_state(state='PROGRESS',
            meta={'current': current, 'total': total})
    def update_complete(file_name, content):
        PACKAGE_CACHE[async_menu_export.request.id] = {"file": content, "file_name": file_name, "is_ready": True}

    MenuAdmin.generate_export(menu_name, complete_cb=update_complete, update_progress_cb=update_progress)
