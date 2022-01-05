from django.conf.urls import url
from django.urls import path, include

from cms.views import integration, article, agreement, asset, documentation, menu, release_notes, utils, portal_notifications, openapi_json

from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'custom_clients', asset.CustomClientViewSet,
                basename='custom_client')
router.register(r'asset_cms', asset.AssetViewSet, basename='asset')

urlpatterns = [
    path('', include(router.urls)),
    url(r'^integration/(?P<asset_id>.+?)/?$',
        integration.get_integration, name="get_integration"),
    url(r'^integrations$', integration.get_integrations, name="get_integrations"),
    path('integration_count', integration.get_integrations_count,
         name='integration_count'),
    path('article/<url_param>/', article.get_article, name='get_article'),
    path('release-notes/<int:asset_id>', release_notes.get_release_note, name='get_release_note'),
    path('release-notes', release_notes.get_release_notes, name='get_release_notes'),
    path('agreement', agreement.get_agreement, name='get_agreement'),
    path('accept_agreement', agreement.accept_agreement, name='accept_agreement'),
    path('accept_review', asset.accept_review, name='accept_review'),
    path('assets', asset.get_assets, name='get_assets'),
    path('documentation/struct/<str:name>', documentation.menu_to_endpoint),
    path('documentation/kb/<str:name>',
         documentation.get_pages, name='doc_pages'),
    path('documentation/kb/<str:name>/search',
         documentation.kb_search, name='kb_search'),
    path('documentation/kb_search', documentation.kb_search, name='kb_search'),
    path('documentation/kb/<str:name>/sync_search',
         documentation.sync_search, name='sync_search'),
    path('documentation/sync_search',
         documentation.sync_search, name='sync_search'),
    path('documentation/find_kb/<int:doc_id>',
         documentation.kb_for_article, name='find_doc_kb'),
    path('documentation/<int:doc_id>', documentation.get_page, name='doc_page'),
    path('menus/<str:name>', menu.get_menu, name='get_menu'),
    path('menu_force_sync', menu.menu_force_sync, name='menu_force_sync'),
    path('menu_clean_zd', menu.menu_clean_zd, name='menu_clean_zd'),
    path('menu_cancel_sync', menu.menu_cancel_sync, name='menu_cancel_sync'),
    path('sanitize_html', utils.sanitize_html, name='sanitize_html'),
    path('portal_notifications', portal_notifications.notifications, name='portal_notifications'),
    path('openapi_jsons/<int:json_id>', openapi_json.get_openapi_json, name="get_openapi_json"),
    path('openapi_jsons', openapi_json.get_openapi_jsons, name="get_openapi_jsons")
]


