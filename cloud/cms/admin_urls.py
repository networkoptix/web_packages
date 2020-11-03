from django.conf.urls import url
from django.urls import path

from cms.views import asset

urlpatterns = [
    url(r'download/(?P<path>.*)$', asset.download_file, name="download_file"),
    url(r'download-structure-from-db/(?P<asset_id>.+?)/?$', asset.download_current_structure,
        name="download_structure_from_db"),
    path('download_all_asset_structures/<int:asset_type>', asset.download_all_asset_structures,
        name="download_all_asset_structures"),
    url(r'preview/', asset.make_preview, name="preview"),

    url(r'^package/(?P<asset_id>.+?)/?$', asset.download_package, name="download_package"),
    url(r'^async_package/(?P<asset_id>.+?)/?$', asset.download_async_package, name="download_package_async"),

    url(r'asset_settings/(?P<asset_id>.+?)/$', asset.asset_settings, name="asset_settings"),
    url(r'get_asset_ids/?$', asset.get_asset_ids_by_asset_type, name="asset_ids_by_type"),
    path('asset_autocomplete', asset.MenuAssetAutocomplete.as_view(create_field='name'), name='asset_autocomplete'),
    path('asset_state/<int:asset_id>', asset.get_asset_state, name='asset_state')
]
