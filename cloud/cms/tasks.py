from celery import shared_task, current_task

from cms.controllers import filldata
from api.models import Account
from cms.models import Asset, Menu, PackagesCache
from celery.result import AsyncResult


def get_package_cache_key(asset: Asset, preview, version_id):
    cache_key = f"{asset.id}-{version_id or asset.version_id()}"
    if preview:
        cache_key += "-preview"
    return cache_key


@shared_task
def make_package(asset_id, preview, version_id):
    def update_progress(current, total):
        current_task.update_state(state='PROGRESS',
            meta={'current': current, 'total': total})
    PACKAGE_CACHE = PackagesCache()
    asset = Asset.objects.get(id=asset_id)
    cache_key = get_package_cache_key(asset, preview, version_id)

    zip_package = filldata.get_zip_package(asset, preview, version_id, update_progress_cb=update_progress)
    PACKAGE_CACHE[cache_key] = {"file": zip_package, "is_ready": True}


@shared_task
def async_menu_import(menu_dict, menu_name, user_email, accept_reviews=False):
    menu = Menu.objects.get(name=menu_name)
    user = Account.objects.get(email=user_email)
    def update_progress(current, total, error = None):
        task = async_menu_import.AsyncResult(async_menu_import.request.id)
        errors = task.result.get('errors', []) if task.result else []
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
        DOWNLOAD_CACHE = PackagesCache()
        DOWNLOAD_CACHE[async_menu_export.request.id] = {"file": content, "file_name": file_name, "is_ready": True}

    MenuAdmin.generate_export(menu_name, complete_cb=update_complete, update_progress_cb=update_progress)
