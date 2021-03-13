from django.conf.urls import url
from django.urls import path

from cms.views import integration, article, agreement, asset, documentation, menu


urlpatterns = [
    url(r'^integration/(?P<asset_id>.+?)/?$', integration.get_integration, name="get_integration"),
    url(r'^integrations$', integration.get_integrations, name="get_integrations"),
    path('integration_count', integration.get_integrations_count, name='integration_count'),
    path('article/<url_param>/', article.get_article, name='get_article'),
    path('agreement', agreement.get_agreement, name='get_agreement'),
    path('accept_agreement', agreement.accept_agreement, name='accept_agreement'),
    path('accept_review', asset.accept_review, name='accept_review'),
    path('documentation/struct/<str:name>', documentation.menu_to_endpoint),
    path('documentation/kb/<str:name>', documentation.get_pages, name='doc_pages'),
    path('documentation/find_kb/<int:doc_id>', documentation.kb_for_article, name='find_doc_kb'),
    path('documentation/<int:doc_id>', documentation.get_page, name='doc_page'),
    path('menus/<str:name>', menu.get_menu, name='get_menu'),
]


