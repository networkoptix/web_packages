from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

from api.helpers.exceptions import (
    api_success, handle_exceptions, APINotFoundException, APIForbiddenException)
from cms.controllers.filldata import global_contexts_to_dict, process_global_contexts
from cms.models import (Context, Asset, AssetType, get_cloud_portal_asset, Language, 
                        AssetCustomizationReview, DataStructure)
from util.helpers import get_language_object_from_request

state__query_param = openapi.Parameter("state", openapi.IN_QUERY,
                                       description="State of the article. Ex: draft, published, or review",
                                       type=openapi.TYPE_STRING)
id__query_param = openapi.Parameter("id", openapi.IN_QUERY, type=openapi.TYPE_STRING)
url__route_param = openapi.Parameter("url_param", openapi.IN_PATH,
                                     description="Route in the url that points to the article.",
                                     type=openapi.TYPE_STRING)


@swagger_auto_schema(method="GET",
                     operation_description="Returns an article based on params",
                     manual_parameters=[state__query_param, id__query_param, url__route_param])
@api_view(("GET", ))
@permission_classes((AllowAny, ))
def get_article(request, url_param, **kwargs):
    draft = request.query_params.get('state') == 'draft'
    review = request.query_params.get('state') == 'pending'
    article_id = request.query_params.get('id')
    language = get_language_object_from_request(request)
    article = None

    if article_id:
        # If id is provided, then only search with id, url_parm is ignored to make sure correct article is found
        # Used primarily for showing previews correctly
        article = Asset.objects.filter(id=article_id).first()

    else:
        article_review = AssetCustomizationReview.objects.filter(
            version__asset__datarecord__value=url_param, version__asset__datarecord__data_structure__name='url',
            version__asset__asset_type__type=AssetType.ASSET_TYPES.article,
            state=AssetCustomizationReview.REVIEW_STATES.accepted, customization__name=settings.CUSTOMIZATION
        ).order_by('-reviewed_date').first()
        if article_review:
            # Check that that the asset's current url still matches
            article = article_review.version.asset
            version = article.version_id(settings.CUSTOMIZATION)
            url_ds = DataStructure.objects.get(context__asset_type=article.asset_type, name='url')
            if url_ds.find_actual_value(asset=article, version_id=version,
                                        customization_name=settings.CUSTOMIZATION) != url_param:
                article = None

    # If article is not found, then return a 404
    if article:
        if (draft or review) and not (request.user.is_superuser or article.created_by == request.user):
            raise APIForbiddenException(error_data={'url_param': url_param},
                                        error_text='Not allowed to view this preview')

        # Set version based on draft or pending query params
        version = article.version_id()
        if review:
            pending_review = AssetCustomizationReview.objects.filter(
                version__id__gt=version, version__asset=article, customization__name=settings.CUSTOMIZATION,
                state=AssetCustomizationReview.REVIEW_STATES.pending).last()
            if pending_review:
                version = pending_review.version.id
        elif draft:
            version = None

        # If version is 0, then article has no acceptable version and the request isn't for a draft
        if version != 0:
            article_structures = DataStructure.objects.filter(context__asset_type__type=AssetType.ASSET_TYPES.article)

            # Get values for title and body of article for this version
            title = article_structures.filter(name='title').first().find_actual_value(
                asset=article, language=language, version_id=version, draft=draft or review,
                customization_name=settings.CUSTOMIZATION
            )
            body = article_structures.filter(name='body').first().find_actual_value(
                asset=article, language=language, version_id=version, draft=draft or review,
                customization_name=settings.CUSTOMIZATION
            )
            article_dict = {
                "title": title,
                "body": body
            }

            # Get global contexts and fill any matching variables in datarecords
            cloud_portal = get_cloud_portal_asset()
            global_contexts = Context.objects.filter(asset_type=cloud_portal.asset_type, is_global=True, hidden=False)
            global_contexts_dict = global_contexts_to_dict(global_contexts, cloud_portal)
            process_global_contexts(cloud_portal, article_dict, article.version_id(), False,
                                    global_contexts, global_contexts_dict, language=language)

            return api_success(article_dict)

    raise APINotFoundException(error_data={'url_param': url_param}, error_text='Article not found')
