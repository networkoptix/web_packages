from django.conf.urls import url
from django.urls import path
from cms.views import integration, article


urlpatterns = [
    url(r'^integration/(?P<product_id>.+?)/?$', integration.get_integration, name="get_integration"),
    url(r'^integrations$', integration.get_integrations, name="get_integrations"),
    path('article/<url_param>/', article.get_article, name='get_article')
]
