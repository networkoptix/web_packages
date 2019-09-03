from api.helpers.exceptions import api_success, handle_exceptions, APINotFoundException
from cms.controllers.filldata import global_contexts_to_dict, process_global_contexts
from cms.models import Context, Product, ProductType, get_cloud_portal_product, Language, ProductCustomizationReview, \
    DataStructure
from django.conf import settings
from django.db.models import Count
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from util.helpers import detect_language_by_request


@api_view(("GET", ))
@permission_classes((AllowAny, ))
@handle_exceptions
def get_article(request, url_param, **kwargs):
    draft = request.query_params.get('state') == 'draft'
    review = request.query_params.get('state') == 'review'
    article_id = request.query_params.get('id')

    if article_id:
        # If id is provided, then only search with id, url_parm is ignored to make sure correct article is found
        # Used primarily for showing previews correctly
        article = Product.objects.filter(id=article_id, customizations__name=settings.CUSTOMIZATION).first()

    else:
        # Try to get an article that has ONLY the current customization
        article = Product.objects.annotate(num_customizations=Count('customizations')).filter(
            num_customizations=1, datarecord__value=url_param,
            datarecord__data_structure__context__product_type__type=ProductType.PRODUCT_TYPES.article,
            datarecord__data_structure__name='url', customizations__name=settings.CUSTOMIZATION,
            contentversion__productcustomizationreview__state=ProductCustomizationReview.REVIEW_STATES.accepted
        ).last()

        # Otherwise, get the most recently accepted article that has the current customization
        if not article:
            review = ProductCustomizationReview.objects.filter(
                version__product__datarecord__value=url_param, version__product__datarecord__data_structure__name='url',
                version__product__product_type__type=ProductType.PRODUCT_TYPES.article,
                state=ProductCustomizationReview.REVIEW_STATES.accepted, customization__name=settings.CUSTOMIZATION
            ).order_by('-reviewed_date').first()
            if review:
                article = review.version.product

    # If article is not found, then return a 404
    if article:
        # Set version based on draft or pending query params
        version = article.version_id()
        if review:
            pending_review = ProductCustomizationReview.objects.filter(
                version__id__gt=version, version__product=article, customization__name=settings.CUSTOMIZATION,
                state=ProductCustomizationReview.REVIEW_STATES.pending).last()
            if pending_review:
                version = pending_review.version.id
        elif draft:
            version = None

        # If version is 0, then article has no acceptable version and the request isn't for a draft
        if version != 0:
            language = Language.by_code(detect_language_by_request(request))

            # Get values for title and body of article for this version
            title = DataStructure.objects.filter(name='title').first().find_actual_value(product=article,
                                                                                         language=language,
                                                                                         version_id=version,
                                                                                         draft=draft or review)
            body = DataStructure.objects.filter(name='body').first().find_actual_value(product=article,
                                                                                       language=language,
                                                                                       version_id=version,
                                                                                       draft=draft or review)
            article_dict = {
                "title": title,
                "body": body
            }

            # Get global contexts and fill any matching variables in datarecords
            cloud_portal = get_cloud_portal_product()
            global_contexts = Context.objects.filter(product_type=cloud_portal.product_type, is_global=True)
            global_contexts_dict = global_contexts_to_dict(global_contexts, cloud_portal)
            process_global_contexts(cloud_portal, article_dict, article.version_id(), False,
                                    global_contexts, global_contexts_dict)

            return api_success(article_dict)

    raise APINotFoundException(error_data={'url_param': url_param}, error_text='Article not found')
