from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

from api.helpers.exceptions import (
    api_success, handle_exceptions, APINotFoundException, APIForbiddenException)
from cms.controllers.filldata import global_contexts_to_dict, process_global_contexts
from cms.models import (Context, Asset, AssetType, get_cloud_portal_asset, AssetCustomizationReview,
                        DataStructure, ContributerAgreement)

state__query_param = openapi.Parameter(
    "state", openapi.IN_QUERY,
    lambdadescription="State of the agreement. Ex: draft, published, or review",
    type=openapi.TYPE_STRING)
id__query_param = openapi.Parameter("id", openapi.IN_QUERY, type=openapi.TYPE_STRING)


@swagger_auto_schema(method="GET", auto_schema=None,
                     operation_description="Developer Agreement to use the integration store.",
                     manual_parameters=[state__query_param, id__query_param])
@api_view(("GET", ))
@permission_classes((AllowAny, ))
@handle_exceptions
def get_agreement(request):
    draft = request.query_params.get('state') == 'draft'
    review = request.query_params.get('state') == 'pending'
    agreement_id = request.query_params.get('id')
    agreement = None
    agreement_review = None

    if agreement_id:
        # If id is provided, then only search with id
        # Used primarily for showing previews correctly
        agreement = Asset.objects.filter(id=agreement_id).first()
    else:
        agreement_review = AssetCustomizationReview.objects.filter(
            version__asset__asset_type__type=AssetType.ASSET_TYPES.agreement,
            state=AssetCustomizationReview.REVIEW_STATES.accepted, customization__name=settings.CUSTOMIZATION
        ).order_by('-reviewed_date').first()
        if agreement_review:
            agreement = agreement_review.version.asset

    # If agreement is not found, then return a 404
    if agreement:
        if (draft or review) and not (request.user.is_superuser or agreement.created_by == request.user):
            raise APIForbiddenException(error_data={'id': agreement_id}, error_text='Not allowed to view this preview')

        # Set version based on draft or pending query params
        version = agreement.version_id()
        if review:
            pending_review = AssetCustomizationReview.objects.filter(
                version__id__gt=version, version__asset=agreement, customization__name=settings.CUSTOMIZATION,
                state=AssetCustomizationReview.REVIEW_STATES.pending).last()
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
                asset=agreement, version_id=version, draft=draft or review
            )
            body = agreement_structures.filter(name='text').first().find_actual_value(
                asset=agreement, version_id=version, draft=draft or review
            )
            agreement_dict = {
                "title": title,
                "body": body,
                'id': agreement.id,
                'review_id': agreement_review.id if agreement_review else 0,
                'preview': review or draft,
                'accepted': ContributerAgreement.objects.filter(
                    accepted_agreement=agreement_review, user=request.user
                ).exists() if agreement_review and request.user.is_authenticated else False
            }

            # Get global contexts and fill any matching variables in datarecords
            cloud_portal = get_cloud_portal_asset()
            global_contexts = Context.objects.filter(asset_type=cloud_portal.asset_type, is_global=True)
            global_contexts_dict = global_contexts_to_dict(global_contexts, cloud_portal)
            process_global_contexts(cloud_portal, agreement_dict, agreement.version_id(), False,
                                    global_contexts, global_contexts_dict)

            return api_success(agreement_dict)

    raise APINotFoundException(error_text='Agreement not found')


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
@handle_exceptions
def accept_agreement(request):
    review_id = request.data.get('review_id', None)
    if review_id is None:
        return api_success("No review id provided", status_code=status.HTTP_404_NOT_FOUND)

    agreement_review = AssetCustomizationReview.objects.filter(
        version__asset__asset_type__type=AssetType.ASSET_TYPES.agreement,
        state=AssetCustomizationReview.REVIEW_STATES.accepted, customization__name=settings.CUSTOMIZATION, id=review_id
    ).first()

    if agreement_review:
        ContributerAgreement.objects.get_or_create(accepted_agreement=agreement_review, user=request.user)
        return api_success()
    else:
        return api_success("Agreement review not found.", status_code=status.HTTP_404_NOT_FOUND)
