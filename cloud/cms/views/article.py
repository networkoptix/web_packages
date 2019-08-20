from api.helpers.exceptions import api_success, handle_exceptions, APINotFoundException
from cms.controllers.filldata import global_contexts_to_dict, process_global_contexts
from cms.models import Context, DataStructure, Product, ProductType, get_cloud_portal_product, Language
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from util.helpers import detect_language_by_request


@api_view(("GET", ))
@permission_classes((AllowAny, ))
@handle_exceptions
def get_article(request, url_param, **kwargs):
    articles = Product.objects.filter(product_type__type=ProductType.PRODUCT_TYPES.article,
                                      customizations__name__in=[settings.CUSTOMIZATION])
    url_structure = DataStructure.objects.filter(context__product_type__type=ProductType.PRODUCT_TYPES.article,
                                                 name='url').first()

    for article in articles:
        if url_param == url_structure.find_actual_value(product=article):
            cloud_portal = get_cloud_portal_product()
            global_contexts = Context.objects.filter(product_type=cloud_portal.product_type, is_global=True)
            global_contexts_dict = global_contexts_to_dict(global_contexts, cloud_portal)
            language = Language.by_code(detect_language_by_request(request))
            content = Context.objects.filter(product_type__type=ProductType.PRODUCT_TYPES.article,
                                             name='content').first()
            title = content.datastructure_set.filter(name='title').first().find_actual_value(product=article,
                                                                                             language=language)
            body = content.datastructure_set.filter(name='body').first().find_actual_value(product=article,
                                                                                           language=language)
            article_dict = {
                "title": title,
                "body": body
            }
            process_global_contexts(cloud_portal, article_dict, article.version_id(), False,
                                    global_contexts, global_contexts_dict)
            return api_success(article_dict)

    raise APINotFoundException(error_data={'url_param': url_param}, error_text='Article not found')
