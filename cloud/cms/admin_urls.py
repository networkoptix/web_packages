from django.conf import settings
from django.conf.urls import url
from django.urls import path

from cms.views import asset, celery, menu, utils

urlpatterns = [
    url(r'download/(?P<path>.*)$', asset.download_file, name="download_file"),
    url(r'download-structure-from-db/(?P<asset_id>.+?)/?$', asset.download_current_structure,
        name="download_structure_from_db"),
    path('download_all_asset_structures/<int:asset_type>', asset.download_all_asset_structures,
        name="download_all_asset_structures"),
    url(r'preview/', asset.make_preview, name="preview"),

    url(r'^celery/check_status/(?P<task_id>.+?)/?$', celery.check_status, name="celery_check_status"),
    url(r'^celery/download_result/(?P<task_id>.+?)/?$', celery.download_result, name="celery_download_result"),

    url(r'^package/(?P<asset_id>.+?)/?$', asset.download_package, name="download_package"),
    url(r'^async_package/(?P<asset_id>.+?)/?$', asset.download_async_package, name="download_package_async"),

    url(r'^upload_image/(?P<asset_id>.+?)/(?P<ds_id>.+?)/?$', asset.upload_image, name="upload_image"),

    url(r'asset_settings/(?P<asset_id>.+?)/$', asset.asset_settings, name="asset_settings"),
    url(r'asset_type_settings/(?P<asset_type_id>.+?)/$', asset.asset_type_settings, name="asset_type_settings"),
    url(r'get_asset_ids/?$', asset.get_asset_ids_by_asset_type, name="asset_ids_by_type"),
    path('asset_autocomplete', asset.MenuAssetAutocomplete.as_view(create_field='name'), name='asset_autocomplete'),
    path('asset_info/<int:asset_id>', asset.get_asset_info, name='asset_info'),
    path('asset_info/by_menu/<int:menu_id>', asset.get_asset_info_by_menu, name='asset_info_by_menu'),
    path('menu_node_autocomplete', menu.MenuNodeAutocomplete.as_view(), name='menu_node_autocomplete')
]

if settings.DEBUG:
    urlpatterns += [
        path('qa_settings', utils.QASettings.as_view(), name='qa_settings')
    ]
