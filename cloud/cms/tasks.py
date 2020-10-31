from celery import shared_task

from cms.controllers import filldata
from cms.models import Asset, PackagesCache


def get_package_cache_key(asset: Asset, preview, version_id):
    cache_key = f"{asset.id}-{version_id or asset.version_id()}"
    if preview:
        cache_key += "-preview"
    return cache_key


@shared_task
def make_package(asset_id, preview, version_id):
    asset = Asset.objects.get(id=asset_id)
    cache_key = get_package_cache_key(asset, preview, version_id)

    zip_package = filldata.get_zip_package(asset, preview, version_id)
    PACKAGE_CACHE = PackagesCache()
    PACKAGE_CACHE[cache_key] = {"file": zip_package, "is_ready": True}
