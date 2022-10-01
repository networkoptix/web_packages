from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

from cloud.helpers.exceptions import (
    api_success, handle_exceptions, APINotFoundException, APIForbiddenException)
from cms.controllers.asset_json import get_review_matching_current_version
from cms.controllers.filldata import global_contexts_to_dict, ContextProcessor
from cms.models import (Context, Asset, AssetType, get_cloud_portal_asset, AssetCustomizationReview,
                        DataStructure, ContributorAgreement)
from cms.serializers import AgreementSerializer
from util.base_cache import BaseCache
from util.helpers import get_customization, get_language_object_from_request

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
    AGREEMENT_CACHE = BaseCache(cache_key='agreement')
    state = request.query_params.get('state') or 'accepted'
    draft = state == 'draft'
    review = state == 'pending'
    agreement_id = request.query_params.get('id')
    language = get_language_object_from_request(request)
    customization=get_customization(request)
    agreement = None
    agreement_review = None
    version = None
    cached_agreement = None
    if agreement_id:
        # If id is provided, then only search with id
        # Used primarily for showing previews correctly
        agreement = Asset.objects.filter(id=agreement_id).first()
    else:
        agreement_review = AssetCustomizationReview.objects.filter(
            version__asset__asset_type__type=AssetType.ASSET_TYPES.agreement,
            state=AssetCustomizationReview.REVIEW_STATES.accepted, customization__name=customization
        ).last()

        if not agreement_review:
            return api_success("Agreement not available", status_code=status.HTTP_404_NOT_FOUND)

        agreement_id = agreement_review.version.asset.id
        AGREEMENT_CACHE.lookup_key = BaseCache.generate_lookup_key(
            language, state, agreement_id, agreement_review.version, request=request)
        cached_agreement = AGREEMENT_CACHE.get_cached_item()

        if agreement_review and not cached_agreement:
            agreement = agreement_review.version.asset

    # If agreement is not found, then return a 404
    if agreement or cached_agreement:
        if (
            ((draft or review))
            and not request.user.is_superuser
            and agreement.created_by != request.user
        ):
            raise APIForbiddenException(
                error_data={'id': agreement_id}, error_text=PREVIEW_NOT_ALLOWED)
        if cached_agreement:
            return api_success(cached_agreement)

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
            agreement_structures = DataStructure.objects.filter(
                context__asset_type__type=AssetType.ASSET_TYPES.agreement
            )

            # Get values for title and body of agreement for this version
            title = agreement_structures.filter(name='title').first().find_actual_value(
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
                "shortDescription": short_description,
                "body": body,
                'id': agreement.id,
                'review_id': agreement_review.id if agreement_review else 0,
                'preview': review or draft,
                'accepted': ContributorAgreement.objects.filter(
                    accepted_agreement=agreement_review, user=request.user
                ).exists() if agreement_review and request.user.is_authenticated else False
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

            serializer = AgreementSerializer(data=agreement_dict)
            serializer.is_valid()
            agreement_dict = serializer.data

            AGREEMENT_CACHE.set_cached_item(agreement_dict)
            if agreement_id:
                AGREEMENT_CACHE.lookup_key = BaseCache.generate_lookup_key(
                    language, state, request=request)
                AGREEMENT_CACHE.set_cached_item(agreement_dict)
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
        state=AssetCustomizationReview.REVIEW_STATES.accepted, customization__name=get_customization(request), id=review_id
    ).last()

    if agreement_review:
        ContributorAgreement.objects.get_or_create(
            accepted_agreement=agreement_review, user=request.user)
        return api_success()
    else:
        return api_success(AGREEMENT_REVIEW_NOT_FOUND, status_code=status.HTTP_404_NOT_FOUND)
