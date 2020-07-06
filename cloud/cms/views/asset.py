
from django.views.decorators.http import require_http_methods
from django.contrib import messages
from django.contrib.auth.decorators import permission_required
from django.core.exceptions import PermissionDenied
from django.shortcuts import render, redirect
from django.urls import reverse
from django.utils.html import format_html
from django.contrib import admin
from django.http.response import HttpResponse, HttpResponseBadRequest
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

from api.helpers.exceptions import APINotFoundException, api_success, require_params
from api.helpers.permissions import make_customization_visible_to_user
from cms.controllers import filldata, generate_structure, modify_db, structure, structure_to_html
from cms.forms import *
from cms.permissions import IsSuperuser


DRAFT = Asset.PREVIEW_STATUS[Asset.PREVIEW_STATUS.draft]


# Used to get the context and language models
def get_context_and_language(request, context_id, language_code, default_language):
    context = Context.objects.get(id=context_id) if context_id else None

    # Using info in the post request we set the context and language if they are not set already
    if request.method == "POST":
        if not context and request.POST.get('context'):
            context = Context.objects.get(id=request.POST['context'])

        if not language_code:
            language_code = request.POST.get('language')

    # If we are using a GET request and no language is set then we much set it to the users session or the default one
    if not language_code:
        language_code = request.session.get('admin_language')

    language = Language.by_code(language_code, default_language)

    request.session['admin_language'] = language.code
    return context, language


# If there are any errors they will be added to the django messages that show up in the response
def add_upload_error_messages(request, message, errors):
    for error in errors:
        messages.error(
            request, format_html(message.format(error[0], error[1])))


# Used to make sure users without advanced permission don't modify advanced DataStructures
def advanced_touched_without_permission(request_data, data_structures, asset):
    for ds_name in request_data:
        data_structure = data_structures.filter(name=ds_name).first()
        if data_structure and data_structure.advanced:
            db_record_value = data_structure.default
            data_record = data_structure.datarecord_set.filter(asset=asset).order_by('created_date').last()

            if data_record:
                db_record_value = data_record.value

            if request_data[ds_name] != db_record_value:
                return True

    return False


# Handles when users save, create previews, or create reviews
def context_editor_action(request, asset, context_id, language_code):
    context, language = get_context_and_language(request, context_id, language_code, asset.default_language)

    request_data = request.POST
    request_files = request.FILES

    if not (request.user.is_superuser or request.user.has_perm('cms.edit_advanced'))\
            and advanced_touched_without_permission(request_data, context.datastructure_set.all(), asset):
        raise PermissionDenied

    preview_link = ""
    saved_msg = "Changes have been saved."
    upload_errors = []
    asset_errors = []

    language_changed = "languageChanged" in request_data
    preview = "Preview" in request_data
    save_draft = "SaveDraft" in request_data
    send_review = "SendReview" in request_data

    if language_changed or preview or save_draft or send_review:
        current_lang = language
        request_lang = request_data.get('currentLanguage')
        if language_changed and request_lang:
            current_lang = Language.by_code(request_lang)

        upload_errors = modify_db.save_unrevisioned_records(asset, context,
                                                            current_lang, context.datastructure_set.all(),
                                                            request_data, request_files, request.user)

        if send_review:
            saved_msg = ""
            if upload_errors:
                error_msg = "Cannot have any errors when sending for review."
                messages.warning(request, f"{asset.name} - {error_msg}")
            elif not asset.is_dirty:
                error_msg = "Cannot send for review no value was changed for this asset."
                messages.warning(request, f"{asset.name} - {error_msg}")
            else:
                asset_errors = modify_db.send_version_for_review(asset, request.user)
                asset.change_preview_status(asset.PREVIEW_STATUS.review)
                saved_msg += " A new version has been created."

        if upload_errors or asset_errors:
            add_upload_error_messages(request, "Upload error for {}. {}", upload_errors)
            add_upload_error_messages(request, "Asset error for {}. {}", asset_errors)
        else:
            if preview:
                if asset.can_preview_on_portal:
                    if asset.is_dirty:
                        saved_msg += " Preview has been created."
                        asset.change_preview_status(asset.PREVIEW_STATUS.draft)
                        preview_link = modify_db.generate_preview_link(context, asset, state=DRAFT)
                    else:
                        saved_msg = ""
                        add_upload_error_messages(request, "{}", [
                            ("Cannot create preview for this asset no value was changed.", "")
                        ])
                else:
                    add_upload_error_messages(request, "{}", [
                        ("Cannot create preview for this asset on this portal.", "")
                    ])
            if saved_msg:
                messages.success(request, saved_msg)

    return preview_link, upload_errors, asset_errors


# Create your views here.
@require_http_methods(["GET", "POST"])
@permission_required('cms.edit_content')
def page_editor(request):
    asset = Asset.objects.get(id=request.POST['asset_id'])
    context_id = request.POST['context_id']
    language_code = request.POST.get('language')

    if not UserGroupsToAssetPermissions.check_asset_edit_content(request.user, asset):
        raise PermissionDenied

    preview_link, context_errors, asset_errors = context_editor_action(request, asset, context_id, language_code)
    if asset_errors:
        return redirect(asset_errors[0][2]), context_errors

    if "SendReview" in request.POST and not context_errors and not asset_errors:
        customization_reviews = AssetCustomizationReview.objects.\
            filter(state=AssetCustomizationReview.REVIEW_STATES.pending,
                   version_id=ContentVersion.objects.filter(asset=asset).latest('created_date'))

        # If the current customization is in the list of reviews go to that one.
        # Otherwise go to the first customization in the list of reviews.
        try:
            customization_review = customization_reviews.get(customization__name=settings.CUSTOMIZATION)
        except AssetCustomizationReview.DoesNotExist:
            customization_review = customization_reviews.first()

        if customization_review:
            redirect_url = reverse('admin:cms_assetcustomizationreview_change', args=(customization_review.id,))
            return redirect(redirect_url), []

    return preview_link, context_errors


@require_http_methods(["POST"])
@permission_required("cms.change_assetcustomizationreview")
def review(request):
    review_id = request.POST.get('review_id')
    asset_review = AssetCustomizationReview.objects.filter(id=review_id).first()

    if not asset_review:
        return HttpResponseBadRequest("Version does not exist")

    asset = asset_review.version.asset
    ask_question = "ask_question" in request.POST
    force_update = "force_update" in request.POST
    publish = "publish" in request.POST
    reject = "reject" in request.POST

    if force_update and UserGroupsToAssetPermissions.\
            check_customization_permission(request.user, settings.CUSTOMIZATION, 'cms.force_update'):
        if asset.is_cloud_portal and asset.can_preview_on_portal:
            filldata.init_skin(asset, preview=False)
            filldata.init_skin(asset, preview=True)
            messages.success(request, f"Version {asset_review.version.id} was force updated ")
        else:
            messages.error(request, "You cannot force update this asset")

    elif publish and UserGroupsToAssetPermissions.check_customization_publish(request.user):
        if asset.is_cloud_portal and asset.can_preview_on_portal:
            publishing_errors = modify_db.publish_latest_version(asset, review_id, request.user)
            if publishing_errors:
                messages.error(request, f"Version {asset_review.version.id} {publishing_errors}")
            else:
                messages.success(request, f"Version {publishing_errors} has been published")
        else:
            modify_db.update_draft_state(review_id, AssetCustomizationReview.REVIEW_STATES.accepted, request.user)
            messages.success(request, f"Version {asset_review.version.id} has been accepted")

    elif ask_question or reject:
        if reject:
            if not UserGroupsToAssetPermissions.check_customization_publish(request.user):
                raise PermissionDenied
            modify_db.update_draft_state(review_id, AssetCustomizationReview.REVIEW_STATES.rejected, request.user)
            messages.success(request, f"Version {asset_review.version.id} has been rejected")
            asset_review = AssetCustomizationReview.objects.get(id=review_id)

        if "access_customization" in request.POST:
            make_customization_visible_to_user(get_cloud_portal_asset(asset_review.customization),
                                               asset_review.version.created_by)

        note = request.POST["addedNote"]
        message = f'\n{request.user.email}: {note}\n'
        if not UserGroupsToAssetPermissions.\
                check_customization_access(asset_review.version.created_by, asset_review.customization):
            message = f'\nMessage: {note}\n'
        asset_review.notes += message
        asset_review.save()

    elif publish or force_update:
        raise PermissionDenied
    else:
        messages.error(request, "Invalid option selected")

    return


@require_http_methods(["POST"])
@permission_required('cms.change_assetcustomizationreview')
def make_preview(request):
    version_id = request.POST.get('version_id')
    context = Context.objects.filter(id=request.POST['context_id']).first()
    asset = get_asset_by_revision(version_id)

    if not UserGroupsToAssetPermissions.check_asset_edit_content(request.user, asset) and \
            not UserGroupsToAssetPermissions.check_customization_publish(request.user):
        raise PermissionDenied

    if asset.can_preview_on_portal:
        redirect_url = modify_db.generate_preview(asset, context, version_id=version_id, send_to_review=True)
        asset.change_preview_status(asset.PREVIEW_STATUS.review)
    else:
        review = AssetCustomizationReview.objects.get(version_id=version_id,
                                                      customization=asset.customizations.first())
        redirect_url = reverse('admin:cms_assetcustomizationreview_change', args=(review.id,))
        messages.error(request, "This asset can not be previewed")

    return HttpResponse(redirect_url)


def response_attachment(data, filename, content_type):
    response = HttpResponse(data, content_type=content_type)
    response['Content-Disposition'] = 'attachment; filename=%s' % filename
    response.set_cookie('filename', filename, max_age=10)
    return response


asset_settings_wiki = "For more information please go to " \
                      "https://networkoptix.atlassian.net/wiki/spaces/PM/pages/1183057641/Asset+Settings"


@swagger_auto_schema(methods=["GET", "POST"], operation_description=asset_settings_wiki, auto_schema=None)
@api_view(["GET", "POST"])
@permission_classes((IsSuperuser,))
def asset_settings(request, asset_id):
    asset = Asset.objects.get(pk=asset_id)
    form = None
    if request.method == "POST":
        form = AssetSettingsForm(request.POST, request.FILES)
        if not form.is_valid():
            form = None

    if form:
        action = form.cleaned_data['action']
        generate_json = action == 'generate_json'
        merge_with_db = action == 'merge_with_db'
        update_structure = action == 'update_structure'
        create_records_by_json = action == 'create_records_by_json'
        update_content = action == 'update_content'

        file = request.FILES["file"]

        if file.name.endswith('json'):
            if create_records_by_json:
                structure.update_asset_by_json(asset, json.load(file)[0], request.user)
                messages.success(request, "Content updated")
            elif not update_structure:
                return HttpResponseBadRequest('json is acceptable only for Updating structure')
            else:
                cms_structure = json.load(file)
                if type(cms_structure) == list and len(cms_structure) > 1:
                    messages.warning(request, "You can only update one asset_type at a time. "
                                              "Only the first asset type from structure.json was used.")
                structure.update_from_object(cms_structure, asset_type=asset.asset_type, preserve_files=True)
                messages.success(request, "Structure updated")
        else:
            if not file.name.endswith('zip'):
                return HttpResponseBadRequest('zip archive is expected')
            if generate_json:
                data, log_messages = generate_structure.from_zip(file, asset)
                content = json.dumps(data, ensure_ascii=False, indent=4, separators=(',', ': '))
                for error in log_messages:
                    messages.error(request, f'Error with {error["file"]} problem with {error["extension"]}')
                return response_attachment(content, 'structure.json', 'application/json')
            elif merge_with_db:
                data = generate_structure.merge_db_with_archive(file, asset)
                content = json.dumps(data, ensure_ascii=False, indent=4, separators=(',', ': '))
                return response_attachment(content, 'structure.json', 'application/json')

            else:
                log_messages = structure.process_zip(file, request.user, asset, update_structure, update_content)
            for item in log_messages:
                log_type = {
                    'info': messages.INFO,
                    'error': messages.ERROR,
                    'debug': messages.DEBUG,
                    'success': messages.SUCCESS,
                    'warning': messages.WARNING,
                }[item[0]]
                messages.add_message(request, log_type, item[1])
    else:
        form = AssetSettingsForm()

    return render(request, 'cms/asset_settings.html',
                  {'asset': asset,
                   'form': form,

                   'user': request.user,
                   'has_permission': admin.site.has_permission(request),
                   'site_url': admin.site.site_url,
                   'site_header': admin.site.site_header,
                   'site_title': admin.site.site_title,
                   'title': 'Settings for %s' % asset.name})


@require_http_methods(["GET"])
@permission_required('cms.change_asset')
def download_current_structure(request, asset_id):
    use_actual_values = "get_values" in request.GET
    output_format = request.GET.get("format", "json")
    asset = Asset.objects.filter(id=asset_id).last()
    if asset_id and asset:
        if not UserGroupsToAssetPermissions.check_asset_edit_content(request.user, asset):
            raise PermissionDenied
        data = generate_structure.from_database(asset, use_actual_values)
        file_name = "structure.json"
        if output_format == "html":
            data = data[0]
            content = structure_to_html.process_structure_json(data)
            file_name = f"{data['type']}.html"
        else:
            content = json.dumps(data, ensure_ascii=False, indent=4, separators=(',', ': '))
        return response_attachment(content, file_name, 'application')
    return HttpResponseBadRequest("Asset not given or found")


@require_http_methods(["GET"])
@permission_required('cms.change_asset')
def download_file(request, path):
    asset = Asset.objects.filter(id=request.GET.get("asset_id")).first()

    if not UserGroupsToAssetPermissions.check_asset_edit_content(request.user, asset):
        raise PermissionDenied

    language_code = request.GET.get('lang')
    version_id = request.GET.get('version_id')
    preview = 'draft' in request.GET
    file = filldata.read_customized_file(path, asset, language_code, version_id, preview)
    if file:
        return response_attachment(file, os.path.basename(path), "application")
    raise HttpResponseBadRequest("File does not exist")


asset_id__route_param = openapi.Parameter("asset_id", openapi.IN_PATH, type=openapi.TYPE_STRING)
draft__query_param = openapi.\
    Parameter("draft", openapi.IN_QUERY,
              description="Specifics if a draft or published version of the asset should be returned",
              type=openapi.TYPE_STRING)
version_id__query_param = openapi.Parameter("version_id", openapi.IN_QUERY, type=openapi.TYPE_STRING)


@swagger_auto_schema(method="GET", auto_schema=None,
                     operation_description="Download data records for a given asset",
                     manual_parameters=[asset_id__route_param, draft__query_param, version_id__query_param])
@api_view(["GET"])
@permission_classes((IsAuthenticated,))
def download_package(request, asset_id):
    asset = Asset.objects.get(id=asset_id)
    if not request.user.has_perm("cms.can_download_package"):
        raise PermissionDenied

    version_id = request.GET.get('version_id')
    preview = 'draft' in request.GET

    if not preview and not version_id:
        latest_review = AssetCustomizationReview.objects.\
            filter(version__asset=asset,
                   state=AssetCustomizationReview.REVIEW_STATES.accepted).last()
        if latest_review:
            version_id = latest_review.version.id
        else:
            return HttpResponseBadRequest("There are no published versions for this asset.")

    if not asset.is_cloud_portal and len(modify_db.asset_has_required_data(asset, version_id)) > 0:
        error_message = "Asset requires all fields to be filled."
        if version_id:
            error_message = f"Asset does not have all required fields filled for version: {version_id}"
        return HttpResponseBadRequest(error_message)

    zipped_data = filldata.get_zip_package(asset, preview, version_id)
    file_name = f"{asset.name}.zip"
    if asset.is_vms:
        file_name = f"{asset.customizations.first()}.zip"
    return response_attachment(zipped_data, file_name, "application/zip")


customization__query_param = openapi.Parameter("customization", openapi.IN_QUERY, type=openapi.TYPE_STRING)
name__query_param = openapi.Parameter("name", openapi.IN_QUERY, required=True, type=openapi.TYPE_STRING)
type__query_param = openapi.Parameter("type", openapi.IN_QUERY, required=True, type=openapi.TYPE_STRING)


@swagger_auto_schema(method="GET", auto_schema=None,
                     operation_description="Returns a list of asset ids based on an asset type.",
                     manual_parameters=[customization__query_param, name__query_param, type__query_param])
@api_view(["GET"])
@permission_classes((IsAuthenticated,))
def get_asset_ids_by_asset_type(request):

    if not request.user.has_perm("cms.can_download_package"):
        raise PermissionDenied

    require_params(request, ("name", "type"))

    name = request.GET["name"]
    customization = request.GET["customization"]
    asset_type_type = AssetType.get_type_by_name(request.GET["type"])
    asset_type = AssetType.objects.filter(name=name, type=asset_type_type).first()
    if not asset_type:
        raise APINotFoundException("Could not find a matching asset type")

    asset_ids = asset_type.asset_set.values_list('id', flat=True)
    if customization:
        asset_ids = asset_ids.filter(customizations__name__in=[customization])

    return api_success(asset_ids)
