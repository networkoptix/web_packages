from django.conf.urls import url
from django.urls import path

from cms.views import integration, article, agreement, asset, documentation


urlpatterns = [
    url(r'^integration/(?P<asset_id>.+?)/?$', integration.get_integration, name="get_integration"),
    url(r'^integrations$', integration.get_integrations, name="get_integrations"),
    path('article/<url_param>/', article.get_article, name='get_article'),
    path('agreement', agreement.get_agreement, name='get_agreement'),
    path('accept_agreement', agreement.accept_agreement, name='accept_agreement'),
    path('accept_review', asset.accept_review, name='accept_review'),
    path('documentation/about_page', documentation.about_page, name='about_page'),
    path('documentation/<int:doc_id>', documentation.get_page, name='doc_page'),
    path('documentation', documentation.get_pages, name='doc_pages'),
]
