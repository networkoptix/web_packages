from api.helpers.exceptions import api_success, handle_exceptions, APINotFoundException
from cms.controllers.filldata import global_contexts_to_dict, process_global_contexts
from cms.models import Context, Product, ProductType, get_cloud_portal_product, Language, ProductCustomizationReview
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from util.helpers import detect_language_by_request


@api_view(("GET", ))
@permission_classes((AllowAny, ))
@handle_exceptions
def get_article(request, url_param, **kwargs):
    draft = "draft" in request.GET
    review = "pending" in request.GET
    article = Product.objects.filter(
        datarecord__data_structure__context__product_type__type=ProductType.PRODUCT_TYPES.article,
        datarecord__data_structure__name='url', customizations__name=settings.CUSTOMIZATION,
        datarecord__value=url_param).last()

    if article:
        version = article.version_id()
        if review:
            pending_review = ProductCustomizationReview.objects.filter(
                version__id__gt=version, version__product=article, customization__name=settings.CUSTOMIZATION,
                state=ProductCustomizationReview.REVIEW_STATES.pending).last()
            if pending_review:
                version = pending_review.version.id
        elif draft:
            version = None

        cloud_portal = get_cloud_portal_product()
        global_contexts = Context.objects.filter(product_type=cloud_portal.product_type, is_global=True)
        global_contexts_dict = global_contexts_to_dict(global_contexts, cloud_portal)
        language = Language.by_code(detect_language_by_request(request))
        content = Context.objects.filter(product_type__type=ProductType.PRODUCT_TYPES.article,
                                         name='content').first()
        title = content.datastructure_set.filter(name='title').first().find_actual_value(product=article,
                                                                                         language=language,
                                                                                         version_id=version,
                                                                                         draft=draft or review)
        body = content.datastructure_set.filter(name='body').first().find_actual_value(product=article,
                                                                                       language=language,
                                                                                       version_id=version,
                                                                                       draft=draft or review)
        article_dict = {
            "title": title,
            "body": body
        }
        process_global_contexts(cloud_portal, article_dict, article.version_id(), False,
                                global_contexts, global_contexts_dict)
        return api_success(article_dict)

    raise APINotFoundException(error_data={'url_param': url_param}, error_text='Article not found')
