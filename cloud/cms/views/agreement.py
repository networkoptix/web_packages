from datetime import datetime, timedelta
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

from cloud.helpers.exceptions import (
    api_success, APINotFoundException, APIForbiddenException)
from cms.controllers.asset_json import get_review_matching_current_version
from cms.controllers.filldata import global_contexts_to_dict, ContextProcessor
from cms.models import (Context, Asset, AssetType, get_cloud_portal_asset, AssetCustomizationReview,
                        DataStructure, ContributorAgreement, AgreementTypes, get_tos_reviews)
from cms.serializers import AgreementSerializer, RequiredTosSerializer
from util.base_cache import AgreementCache, BaseCacheV2
from util.helpers import get_language_object_from_request, detect_language_by_request

AGREEMENT_NOT_FOUND = 'Agreement not found'
PREVIEW_NOT_ALLOWED = 'Not allowed to view this preview'
AGREEMENT_REVIEW_NOT_FOUND = "Agreement review not found."
NO_REVIEW_PROVIDED = "No review id provided"

state__query_param = openapi.Parameter(
    "state", openapi.IN_QUERY,
    description="State of the agreement. Ex: draft, published, or review",
    type=openapi.TYPE_STRING)
id__query_param = openapi.Parameter(
    "id", openapi.IN_QUERY, type=openapi.TYPE_STRING)


@swagger_auto_schema(method="GET", auto_schema=None,
                     operation_description="Developer Agreement to use the integration store.",
                     manual_parameters=[state__query_param, id__query_param],
                     responses={
                         status.HTTP_200_OK: AgreementSerializer()
                     })
@api_view(("GET", ))
@permission_classes((AllowAny, ))
def get_agreement(request):
    state = request.query_params.get('state') or 'accepted'
    draft = state == 'draft'
    review = state == 'pending'
    agreement_id = request.query_params.get('id')
    agreement_type = request.query_params.get('type') or AgreementTypes.contributor
    language = get_language_object_from_request(request)
    customization = request.CUSTOMIZATION
    agreement = None
    agreement_review = None
    version = None
    agreement_dict = None
    agreement_cache = None
    if agreement_id:
        # If id is provided, then only search with id
        # Used primarily for showing previews correctly.
        # Added filter by asset_type to avoid returning non agreement asset
        agreement = Asset.objects.filter(
            id=agreement_id, asset_type__type=AssetType.ASSET_TYPES.agreement).first()
    else:
        tos_reviews = get_tos_reviews(customization)
        if agreement_type == AgreementTypes.tos:
            agreement_review = tos_reviews
        else:
            agreement_review = AssetCustomizationReview.objects.filter(
                version__asset__asset_type__type=AssetType.ASSET_TYPES.agreement,
                state=AssetCustomizationReview.REVIEW_STATES.accepted, customization__name=customization
            ).exclude(id__in=[r.id for r in tos_reviews]).order_by('id')
        agreement_review = agreement_review.last()
        if not agreement_review:
            return api_success("Agreement not available", status_code=status.HTTP_404_NOT_FOUND)

        agreement_id = agreement_review.version.asset.id
        agreement_cache = AgreementCache(language=language, state=state, identifier=agreement_id,
                                         version=agreement_review.version, request=request)
        agreement_dict = agreement_cache.get_cached_item()
        agreement = agreement_review.version.asset


    # If agreement is not found, then return a 404
    if agreement or agreement_dict:
        if (
            ((draft or review))
            and not request.user.is_superuser
            and agreement.created_by != request.user
        ):
            raise APIForbiddenException(
                error_data={'id': agreement_id}, error_text=PREVIEW_NOT_ALLOWED)

        # Set version based on draft or pending query params
        version = agreement.version_id()
        if review:
            pending_review = get_review_matching_current_version(
                agreement, version, request=request)
            if pending_review:
                version = pending_review.version.id
        elif draft:
            version = None

        # If version is 0, then agreement has no acceptable version and the request isn't for a draft
        if version != 0:
            if not agreement_dict:
                agreement_structures = DataStructure.objects.filter(
                    context__asset_type__type=AssetType.ASSET_TYPES.agreement
                )

                # Get values for title and body of agreement for this version
                title = agreement_structures.filter(name='title').first().find_actual_value(
                    asset=agreement, version_id=version, draft=draft or review,
                    customization_name=customization
                )
                agreement_type = agreement_structures.filter(name='type').first().find_actual_value(
                    asset=agreement, version_id=version, draft=draft or review,
                    customization_name=customization
                )
                grace_period = agreement_structures.filter(name='grace_period').first().find_actual_value(
                    asset=agreement, version_id=version, draft=draft or review,
                    customization_name=customization
                )
                body = agreement_structures.filter(name='text').first().find_actual_value(
                    asset=agreement, version_id=version, draft=draft or review,
                    customization_name=customization
                )
                short_description = agreement_structures.filter(name='description').first().find_actual_value(
                    asset=agreement, version_id=version, draft=draft or review,
                    customization_name=customization
                )
                agreement_dict = {
                    "title": title,
                    "type": agreement_type,
                    "grace_period": grace_period,
                    "shortDescription": short_description,
                    "body": body,
                    'id': agreement.id,
                    'review_id': agreement_review.id if agreement_review else 0,
                    'preview': review or draft,
                }

                # Get global contexts and fill any matching variables in datarecords
                cloud_portal = get_cloud_portal_asset(customization=customization)
                global_contexts = Context.objects.filter(
                    asset_type=cloud_portal.asset_type, is_global=True, hidden=False)
                global_contexts_dict = global_contexts_to_dict(
                    global_contexts, cloud_portal)
                context_processor = ContextProcessor(
                    asset=cloud_portal, preview=False, version_id=cloud_portal.version_id(), global_contexts=global_contexts,
                    global_contexts_dict=global_contexts_dict
                )
                context_processor.process_global_contexts(
                    content=agreement_dict, language=language)

                # Cache agreement dict
                if not agreement_cache:
                    agreement_cache = AgreementCache(language=language, state=state, identifier=agreement_id,
                                                     version=version, request=request)
                agreement_cache.set_cached_item(agreement_dict)

            agreement_dict['accepted'] = ContributorAgreement.objects\
                .filter(accepted_agreement=agreement_review, user=request.user).exists() \
                if agreement_review and request.user.is_authenticated else False
            serializer = AgreementSerializer(data=agreement_dict)
            serializer.is_valid()
            agreement_dict = serializer.data
            # Really not sure about this piece of code. Both options (get from cache or db) are resolved on the
            # Agreement retrieving stage L51-L70. Commenting this out.
            # if agreement_id:
            #     AGREEMENT_CACHE.lookup_key = BaseCache.generate_lookup_key(
            #         language, state, request=request)
            #     AGREEMENT_CACHE.set_cached_item(agreement_dict)
            return api_success(agreement_dict)

    raise APINotFoundException(error_text=AGREEMENT_NOT_FOUND)


review_id__body = openapi.Schema(type=openapi.TYPE_NUMBER)


@swagger_auto_schema(method="POST", auto_schema=None,
                     operation_description="Accepts the current published eula.",
                     request_body=openapi.Schema(
                         type=openapi.TYPE_OBJECT,
                         properties={
                             "review_id": review_id__body
                         }
                     ))
@api_view(("POST", ))
@permission_classes((IsAuthenticated, ))
def accept_agreement(request):
    review_id = request.data.get('review_id', None)
    if review_id is None:
        return api_success(NO_REVIEW_PROVIDED, status_code=status.HTTP_404_NOT_FOUND)

    agreement_review = AssetCustomizationReview.objects.filter(
        version__asset__asset_type__type=AssetType.ASSET_TYPES.agreement,
        state=AssetCustomizationReview.REVIEW_STATES.accepted,
        customization__name=request.CUSTOMIZATION, id=review_id
    ).last()

    if agreement_review:
        ContributorAgreement.objects.get_or_create(
            accepted_agreement=agreement_review, user=request.user)
        # clear user cached agreements
        BaseCacheV2(f'{request.CUSTOMIZATION}-user-{request.user.email}-accepted-agreements',
                    customization_name=request.CUSTOMIZATION, cache_key='agreement').clear_cache()
        return api_success()
    else:
        return api_success(AGREEMENT_REVIEW_NOT_FOUND, status_code=status.HTTP_404_NOT_FOUND)


def get_cached_user_agreements(customization, user, force=False):
    user_cache = BaseCacheV2(f'{customization}-user-{user.email}-accepted-agreements',
                             customization_name=customization,
                             cache_key='agreement')
    cached_user_agreements = user_cache.get_cached_item()
    if not cached_user_agreements or force:
        accepted_reviews = ContributorAgreement.objects.filter(user=user).values_list('id', flat=True)
        cached_user_agreements = list(accepted_reviews)
        user_cache.set_cached_item(cached_user_agreements, timeout=86400)
    return cached_user_agreements


def check_required_tos(customization, user):
    agreement_cache = BaseCacheV2(f'{customization}-tos-agreement-latest',
                                  customization_name=customization,
                                  cache_key='agreement')
    cached_review = agreement_cache.get_cached_item()
    if cached_review is None:
        review = get_tos_reviews(customization).last()
        cached_review = RequiredTosSerializer(instance=review).data if review else {}
        agreement_cache.set_cached_item(cached_review, timeout=1800)

    if not cached_review:
        # No TOS agreement for this customization
        return None

    reviewed_date = cached_review['reviewed_date']
    grace_period = cached_review['grace_period']
    if datetime.fromisoformat(reviewed_date) + timedelta(days=grace_period) > datetime.now():
        # It is grace period still
        return None

    cached_user_agreements = get_cached_user_agreements(customization, user)

    if cached_review['id'] not in cached_user_agreements:
        # Returns review for required agreement
        # Todo. Add celery task for cashing this agreement
        return cached_review



