
from cms.views.celery import download_result
from util.helpers import get_admin_url
from django.views.decorators.http import require_http_methods
from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import permission_required
from django.core.exceptions import PermissionDenied
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from django.utils.text import slugify
from django.utils.html import format_html
from django.contrib import admin
from django.http.response import HttpResponse, HttpResponseBadRequest
from oauth2_provider.contrib.rest_framework import IsAuthenticatedOrTokenHasScope
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.exceptions import APIException
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from celery.result import AsyncResult
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema, no_body
from queue import SimpleQueue

from api.helpers.exceptions import APINotFoundException, api_success, require_params
from api.helpers.permissions import make_customization_visible_to_user
from cms.controllers import filldata, generate_structure, modify_db, structure, structure_to_html, documentation
from cms.forms import *
from cms.models import PackagesCache, UserGroupsToAssetPermissions
from cms.permissions import IsSuperuser, CanUseCustomClients
from cms.serializers import CustomClientSerializer, ContentManifestSerializer, GenerateCustomClientSerializer, \
    CheckPackageCustomClientSerializer, PackageDownloadIdSerializer
from cms.tasks import async_import_assets_from_json, get_package_cache_key, make_package, make_structure, \
    make_custom_client, get_custom_client_package_key, TaskErrors

from ..controllers.documentation import DOC_CACHE
from ..views.integration import INTEGRATION_CACHE


DRAFT = Asset.PREVIEW_STATUS[Asset.PREVIEW_STATUS.draft]
PACKAGES_CACHE = PackagesCache()


def make_package_name(asset: Asset):
    file_name = f"{asset.name}.zip"
    if asset.is_vms:
        file_name = f"{asset.customizations.first()}.zip"
    return file_name


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

    if not UserGroupsToAssetPermissions.check_edit_advanced(request.user, asset)\
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
            # To cache documentation and verify that html body can be parsed correctly
            if asset.asset_type.type == AssetType.ASSET_TYPES.documentation:
                documentation.generate_doc_json(
                    [asset], language=language, draft=preview or save_draft, review=send_review
                )
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


@api_view(['POST'])
@permission_classes((IsAdminUser,))
def accept_review(request):
    review_id = request.data.get('review_id')
    asset_review = AssetCustomizationReview.objects.filter(id=review_id).first()
    if not asset_review:
        return APINotFoundException("Review doesn't exist")

    asset = asset_review.version.asset
    customization = asset_review.customization

    if asset.asset_type.type not in [
        AssetType.ASSET_TYPES.integration, AssetType.ASSET_TYPES.documentation, AssetType.ASSET_TYPES.article
    ]:
        raise APIException('Can only accept integrations and articles')

    has_asset_type_permission = UserGroupsToAssetType.check_asset_type(
        request.user, asset.asset_type, 'cms.publish_version'
    )
    can_accept = has_asset_type_permission and UserGroupsToAssetPermissions.check_customization_publish(
        request.user, customization.name,
    )

    if can_accept and asset_review.state == AssetCustomizationReview.REVIEW_STATES.pending:
        modify_db.update_draft_state(review_id, AssetCustomizationReview.REVIEW_STATES.accepted, request.user)
        return api_success('Accepted')

    raise APIException("Can't accept this review")


@require_http_methods(["POST"])
@permission_required("cms.change_assetcustomizationreview")
def review(request):
    def publish_review(target_review, message=True):
        customization = target_review.customization.name
        target_review_id = target_review.id
        customization_cache = MENU_CACHE[customization]
        if customization_cache:
            menus = {node.get_parent() for node in asset.nodes.all()}
            if len(menus):
                MENU_CACHE[customization] = None
        if asset.is_cloud_portal:
            if asset.can_preview_on_portal:
                publishing_errors = modify_db.publish_latest_version(asset, target_review_id, request.user)
                if publishing_errors:
                    messages.error(request, f"Version {target_review.version.id} {publishing_errors}")
                else:
                    messages.success(request, f"Version {publishing_errors} has been published")
            else:
                messages.success(request, "Version {} has been published".format(target_review.version.id))
            INTEGRATION_CACHE.clear_cache()
        else:
            modify_db.update_draft_state(target_review_id, AssetCustomizationReview.REVIEW_STATES.accepted, request.user)
            if message:
                messages.success(request, f"Version {target_review.version.id} has been accepted")
            if asset.is_documentation:
                DOC_CACHE.clear_cache()

    def review_generator(target_reviews):
        queue = SimpleQueue()
        list(map(queue.put, target_reviews))
        blocked_marker = None
        while not queue.empty():
            next_review = queue.get()
            next_review.refresh_from_db()
            if next_review.state == AssetCustomizationReview.REVIEW_STATES.blocked:
                queue.put(next_review)
                if not blocked_marker:
                    blocked_marker = next_review.id
                elif blocked_marker == next_review.id:
                    break
                continue
            elif next_review.state == AssetCustomizationReview.REVIEW_STATES.pending:
                yield next_review
            blocked_marker = None

    review_id = request.POST.get('review_id')
    asset_review = AssetCustomizationReview.objects.filter(id=review_id).first()

    if not asset_review:
        return HttpResponseBadRequest("Version does not exist")

    asset = asset_review.version.asset
    ask_question = "ask_question" in request.POST
    force_update = "force_update" in request.POST
    publish = "publish" in request.POST
    publish_all = "publish_all" in request.POST
    reject = "reject" in request.POST
    revoke = "revoke" in request.POST
    can_publish = UserGroupsToAssetPermissions.check_customization_publish(request.user)
    has_asset_type_permission = UserGroupsToAssetType.check_asset_type(
        request.user, asset.asset_type, 'cms.publish_version'
    )

    if force_update and UserGroupsToAssetPermissions.\
            check_customization_permission(request.user, settings.CUSTOMIZATION, 'cms.force_update'):
        if asset.is_cloud_portal and asset.can_preview_on_portal:
            filldata.init_skin(asset, preview=False)
            filldata.init_skin(asset, preview=True)
            messages.success(request, f"Version {asset_review.version.id} was force updated ")
        else:
            messages.error(request, "You cannot force update this asset")

    elif publish and can_publish and has_asset_type_permission:
        publish_review(asset_review)

    elif publish_all and can_publish and has_asset_type_permission:
        reviews = asset_review.version.assetcustomizationreview_set. \
            filter(customization__in=asset.customizations.all())
        if not request.user.is_superuser:
            reviews = reviews.filter(customization__name__in=request.user.customizations)
        accepted = []
        for target_review in review_generator(reviews):
            if UserGroupsToAssetPermissions.check_customization_publish(request.user, customization=target_review.customization.name):
                publish_review(target_review, message=False)
                accepted.append(target_review.customization)
        accepted_customization_portals = list(Asset.objects.filter(customizations__in=accepted, asset_type__type=AssetType.ASSET_TYPES.cloud_portal).values_list('name', flat=True))
        messages.success(request, f"Version {asset_review.version.id} has been accepted for {', '.join(accepted_customization_portals)}")

    elif revoke and can_publish:
        if asset.is_cloud_portal and not asset.can_preview_on_portal:
            messages.error(request, f"Cannot revoke on this portal")
        else:
            if asset.is_cloud_portal:
                modify_db.publish_latest_version(asset, review_id, request.user,
                                                 AssetCustomizationReview.REVIEW_STATES.rejected)
            else:
                modify_db.update_draft_state(review_id, AssetCustomizationReview.REVIEW_STATES.rejected, request.user)
            messages.success(request, f"Version {asset_review.version.id} has been revoked")

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

    elif force_update or publish or revoke:
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


def response_attachment(data, filename, content_type, attachment=False):
    response = HttpResponse(data, content_type=content_type)
    response['Content-Disposition'] = f'{"attachment; " if content_type == "application" or attachment else ""}filename={filename}'
    response.set_cookie('filename', filename, max_age=10)
    return response


asset_settings_wiki = "For more information please go to " \
                      "https://networkoptix.atlassian.net/wiki/spaces/PM/pages/1183057641/Asset+Settings"


@swagger_auto_schema(methods=["GET", "POST"], operation_description=asset_settings_wiki, auto_schema=None)
@api_view(["GET", "POST"])
@permission_classes((IsSuperuser,))
def asset_settings(request, asset_id):
    task = ''
    force = False
    PACKAGE_CACHE = PackagesCache()
    form = AssetSettingsForm(request.POST, request.FILES, user=request.user)
    asset = Asset.objects.get(pk=asset_id)
    file = request.FILES.get('file', None)
    conflicts = []
    form = form if form.is_valid() else None
    file = PACKAGE_CACHE[form.cleaned_data['action']] if form and not file else file
    form = form if file else None

    if form:
        action = form.cleaned_data['action']
        force = form.cleaned_data['force']
        generate_json = action == 'generate_json'
        merge_with_db = action == 'merge_with_db'
        update_structure = action == 'update_structure'
        update_asset_by_json = action == 'update_asset_by_json'
        import_assets_from_json = action in ('import_assets_from_json', 'import_assets_from_json_publish')
        import_assets_from_json_publish = action == 'import_assets_from_json_publish'
        update_content = action == 'update_content'
        is_loaded = isinstance(file, (list, dict))
        if is_loaded or file.name.endswith('json'):
            skip = False
            loaded_json = file if is_loaded else json.load(file)
            if not force and (update_asset_by_json or import_assets_from_json):
                conflicts = structure.check_asset_conflicts(loaded_json)
                if conflicts:
                    skip = True
                    PACKAGE_CACHE[action] = loaded_json
                    messages.warning(request, 'Some assets contain conflicts with existing records. To force update with new values please check the "Force Update" checkbox.')
            if skip:
                pass
            elif update_asset_by_json:
                structure.update_asset_by_json(asset, loaded_json[0], request.user)
                messages.success(request, "Content updated")
            elif import_assets_from_json:
                json_cache_id = uuid.uuid4()
                PACKAGE_CACHE[json_cache_id] = loaded_json
                task = async_import_assets_from_json.apply_async(args=[json_cache_id, request.user.id, import_assets_from_json_publish])
                messages.info(request, 'Starting assets import')
            elif not update_structure:
                return HttpResponseBadRequest('json is acceptable only for Updating structure')
            else:
                cms_structure = loaded_json
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
        form = AssetSettingsForm(user=request.user)
    if not force:
        messages.info(request, 'Checking asset names...')
    return render(request, 'cms/asset_settings.html',
                  {'asset': asset,
                   'form': form,
                   'conflicts': conflicts,
                   'file': file.name if file and not isinstance(file, (list, dict)) else '',
                   'user': request.user,
                   'has_permission': admin.site.has_permission(request),
                   'site_url': admin.site.site_url,
                   'site_header': admin.site.site_header,
                   'site_title': admin.site.site_title,
                   'task_id': str(task),
                   'title': 'Settings for %s' % asset.name})


@api_view(["GET", "POST"])
@permission_required('cms.change_asset')
def download_current_structure(request, asset_id):
    output_format = request.query_params.get("output_format", "json")
    asset = Asset.objects.get(id=asset_id)
    cache_key = get_package_cache_key(asset, structure_format=output_format)
    structure_info = PACKAGES_CACHE.get(cache_key)
    if not structure_info:
        use_actual_values = "get_values" in request.query_params
        task = make_structure.apply_async(kwargs={'asset_id': asset_id,
            'output_format': output_format, 'use_actual_values': use_actual_values,
            'user_id': request.user.id})
        PACKAGES_CACHE[cache_key] = {"file": None, "is_ready": False, "task_id": str(task)}
        return api_success({"msg": f"Building the {asset} structure", "is_ready": False, "task_id": str(task)})
    task_id = structure_info.get("task_id")
    is_ready = bool(PACKAGES_CACHE.get(task_id))
    return api_success({"msg": f"{asset} structure is ready" if is_ready else f"{asset} structure is not ready", "is_ready": is_ready, "task_id": structure_info.get("task_id")})


def sub_doc_urls(matchobj):
    doc_url_pieces = matchobj.group(2).split('/')
    if len(doc_url_pieces) < 3:
        return matchobj.group(0)

    base_path = doc_url_pieces[0]
    kb_path = doc_url_pieces[1]
    asset_param = doc_url_pieces[2]

    param_id = asset_param.split('-')[0]
    param_name = asset_param[len(param_id):]

    if not param_id.isdigit():
        return matchobj.group(0)

    asset_id = int(param_id)
    asset = Asset.objects.filter(id=asset_id, asset_type__type=AssetType.ASSET_TYPES.documentation).first()
    if not asset:
        return matchobj.group(0)

    url_data = {
        'type': 'kb_article',
        'base': base_path,
        'kb': kb_path,
        'asset_uuid': str(asset.uuid),
        'asset_name': asset.name,
        'param_name': param_name
    }
    doc_var = f'{{% {json.dumps(url_data)} %}}'
    return rf'{matchobj.group(1)}{doc_var}{matchobj.group(3)}'


INTERNAL_DOC_REGEX = re.compile(r'(href=\"(?:[./]*?|%CLOUD_LINK%/)docs/)(.*?)(\")')


def prepare_doc_urls(asset_dict):
    contexts = asset_dict.get('contexts', [])
    content_context = next((context for context in contexts if context.get('name', '') == 'content'), [])
    dss = content_context.get('values', [])
    body = next((ds for ds in dss if ds.get('name', '') == 'body'), None)
    if not body:
        return

    body['value'] = INTERNAL_DOC_REGEX.sub(sub_doc_urls, body.get('value', ''))


def prepare_asset_exports(asset, asset_dict):
    """Handle any special behavior for asset types"""
    if asset.asset_type.type == AssetType.ASSET_TYPES.documentation:
        prepare_doc_urls(asset_dict)


@api_view(["GET", "POST"])
@permission_required('cms.change_asset')
def download_all_asset_structures(request, asset_type):
    last_asset = Asset.objects.filter(asset_type__type=asset_type).latest('contentversion')
    cache_key = f'all-asset-structures-{asset_type}-{last_asset.id}-{last_asset.version_id()}'
    asset_type_name = AssetType.objects.filter(type=asset_type).first()
    structure_info = PACKAGES_CACHE.get(cache_key)
    if not structure_info:
        task = make_structure.apply_async(kwargs={
            'asset_type': asset_type, 'user_id': request.user.id})
        PACKAGES_CACHE[cache_key] = {"file": None, "is_ready": False, "task_id": str(task)}
        return api_success({"msg": f"Building the All {asset_type_name} structures", "is_ready": False, "task_id": str(task)})
    task_id = structure_info.get("task_id")
    is_ready = bool(PACKAGES_CACHE.get(task_id))
    return api_success({"msg": f"All {asset_type_name} structures is ready" if is_ready else f"All {asset_type_name} structures is not ready", "is_ready": is_ready, "task_id": structure_info.get("task_id")})


@require_http_methods(["GET"])
@permission_required('cms.change_asset')
def download_file(request, path):
    asset = Asset.objects.filter(id=request.GET.get("asset_id")).first()
    show_image = request.GET.get("show_image")

    if not UserGroupsToAssetPermissions.check_asset_edit_content(request.user, asset):
        raise PermissionDenied

    language_code = request.GET.get('lang')
    version_id = request.GET.get('version_id')
    preview = 'draft' in request.GET
    file = filldata.read_customized_file(path, asset, language_code, version_id, preview)
    if file:
        return response_attachment(file, os.path.basename(path), "image/png" if show_image else "application")
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
@permission_classes((IsAuthenticatedOrTokenHasScope, ))
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

    if not preview and len(modify_db.asset_has_required_data(asset, version_id)) > 0:
        error_message = "Asset requires all fields to be filled."
        if version_id:
            error_message = f"Asset does not have all required fields filled for version: {version_id}"
        return HttpResponseBadRequest(error_message)

    if asset.is_cloud_portal or asset.is_vms:
        cache_key = get_package_cache_key(asset, preview, version_id)
        package_info = PACKAGES_CACHE.get(cache_key)
        if not package_info:
            task = make_package.apply_async(args=[asset_id, preview, version_id])
            PACKAGES_CACHE[cache_key] = {"file": None, "is_ready": False, "task_id": str(task)}
            return api_success({"msg": "Building the package", "is_ready": False, "task_id": str(task)})
        is_ready = package_info.get("is_ready")
        return api_success({"msg": "Package is ready" if is_ready else "Package is not ready", "is_ready": is_ready, "task_id": package_info.get("task_id")})
    else:
        zipped_data = filldata.PackageExporter(asset, preview, version_id).get_zip_package()
        return response_attachment(zipped_data, make_package_name(asset), "application/zip")


@api_view(["GET"])
@permission_classes((IsAuthenticatedOrTokenHasScope, ))
def download_async_package(request, asset_id):
    asset = Asset.objects.get(id=asset_id)
    if not request.user.has_perm("cms.can_download_package"):
        raise PermissionDenied

    version_id = request.GET.get('version_id')
    preview = 'draft' in request.GET

    cache_key = get_package_cache_key(asset, preview, version_id)
    package_info = PACKAGES_CACHE.get(cache_key)
    if not package_info:
        return api_success({"msg": "No package is being made"})
    elif not package_info.get("is_ready"):
        return api_success({"msg": "Package is not ready"})
    else:
        zipped_data = PACKAGES_CACHE[cache_key]
        return response_attachment(zipped_data.get("file"), make_package_name(asset), "application/zip")


customization__query_param = openapi.Parameter("customization", openapi.IN_QUERY, type=openapi.TYPE_STRING)
name__query_param = openapi.Parameter("name", openapi.IN_QUERY, required=True, type=openapi.TYPE_STRING)
type__query_param = openapi.Parameter("type", openapi.IN_QUERY, required=True, type=openapi.TYPE_STRING)


@swagger_auto_schema(method="GET", auto_schema=None,
                     operation_description="Returns a list of asset ids based on an asset type.",
                     manual_parameters=[customization__query_param, name__query_param, type__query_param])
@api_view(["GET"])
@permission_classes((IsAuthenticatedOrTokenHasScope, ))
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


class MenuAssetAutocomplete(autocomplete.Select2QuerySetView):
    def get_queryset(self):
        # Don't forget to filter out results depending on the visitor !
        if not self.request.user.is_staff:
            return Asset.objects.none()

        qs = Asset.objects.filter(
            asset_type__type__in=[AssetType.ASSET_TYPES.documentation, AssetType.ASSET_TYPES.integration]
        )
        if not self.request.user.is_superuser:
            qs = qs.filter(customization__name__in=self.request.user.customizations_with_permission('cms.publish_version'))

        if self.q:
            qs = qs.filter(name__icontains=self.q)
        return qs

    def create_object(self, text):
        doc_type = AssetType.objects.filter(type=AssetType.ASSET_TYPES.documentation, name='').order_by('pk').first()
        params = {
            'asset_type': doc_type,
            self.create_field: text
        }
        asset, created = self.get_queryset().get_or_create(**params)
        if created:
            asset.customizations.set(Customization.objects.all())
        return asset


def prepare_asset_info(request, customization, asset, ignore_error = False):
    review_url = None
    if (
        not request.user.is_superuser
        and not (
            UserGroupsToAssetPermissions.check_customization_publish(
                request.user
            )
            and UserGroupsToAssetType.check_asset_type(
                request.user, asset.asset_type, 'cms.publish_version'
            )
        )
        and not ignore_error
    ):
        raise APIException('Cannot access state for this asset')
    state = 'Draft'
    if customization and customization != 'all':
        if not asset.is_dirty:
            latest_review = AssetCustomizationReview.objects.filter(
                customization__name=customization, version__asset=asset).last()
            if latest_review:
                state = AssetCustomizationReview.REVIEW_STATES[latest_review.state]
                review_url = get_admin_url(latest_review)
    else:
        state = None
    enabled_customizations_dict = {cust.id: cust.name for cust in asset.customizations.filter(
        name__in=request.user.customizations)}
    return {'state': state, 'customizations': enabled_customizations_dict, 'review_url': review_url}


@api_view(["GET"])
@permission_classes((IsAuthenticatedOrTokenHasScope, ))
def get_asset_info(request, asset_id):
    require_params(request, ('customization',))
    customization = request.GET.get('customization')
    asset = get_object_or_404(Asset, id=asset_id)
    asset_info = prepare_asset_info(request, customization, asset)
    return api_success(asset_info)


def prepare_asset_info_for_menu(request, menu_id):
    customization = request.GET.get('customization')
    menu = get_object_or_404(Menu, id=menu_id)
    assets = Asset.objects.filter(id__in=menu.all_asset_ids)
    return {
        asset.id: prepare_asset_info(request, customization, asset, True)
        for asset in assets
    }


@api_view(["GET"])
@permission_classes((IsSuperuser,))
def get_asset_info_by_menu(request, menu_id):
    require_params(request, ('customization',))
    return api_success(prepare_asset_info_for_menu(request, menu_id))


class CustomClientViewSet(ModelViewSet):
    permission_classes = [IsAuthenticatedOrTokenHasScope, CanUseCustomClients]
    serializer_class = CustomClientSerializer

    def get_queryset(self):
        if self.request.user.is_superuser:
            return CustomClient.objects.filter(created_customization__name=settings.CUSTOMIZATION)
        else:
            return self.request.user.customclient_set.filter(created_customization__name=settings.CUSTOMIZATION)

    def perform_create(self, serializer):
        kwargs = {}
        if not settings.META:
            kwargs['base_vms'] = get_vms_asset(settings.CUSTOMIZATION)
        serializer.save(
            created_by=self.request.user,
            created_customization=Customization.objects.filter(name=settings.CUSTOMIZATION).first(),
            **kwargs
        )

    @action(detail=False, serializer_class=ContentManifestSerializer)
    def get_manifest(self, request):
        fields = [{
                'name': field_props.get('name', field_name),
                'label': field_props.get('label', field_name),
                'type': field_props.get('type', 'text'),
                'metaOnly': field_props.get('metaOnly', False),
                'description': field_props.get('description', ''),
                'optional': field_props.get('optional', False)
            } for field_name, field_props in list(filter(
                lambda item: item[1].get('source', '') == 'custom' and not (
                    item[1].get('metaOnly', False) and not settings.META),
                AssetType.get_custom_fields_by_type(AssetType.ASSET_TYPES.vms).items()
        ))]

        contexts = [{
            'name': 'information',
            'label': 'Information',
            'global': False,
            'fields': fields
        }]

        show_vms_list = settings.META
        vms_list = [{'name': vms.name, 'value': vms.id} for vms in
                    request.user.custom_client_vms_assets] if show_vms_list else []

        settings_dict = {
            'base_vms': {
                'label': 'Based on',
                'hidden': not show_vms_list,
                'options': vms_list
            }
        }
        return api_success({'manifest': {'contexts': contexts, 'settings': settings_dict}})

    @swagger_auto_schema(method='post', request_body=no_body, responses={200: GenerateCustomClientSerializer()})
    @action(detail=True, methods=['post'])
    def generate_package(self, request, pk=None):
        # Get object to make sure it exists and user has access
        custom_client = self.get_object()
        download_id = uuid.uuid4()
        task_id = make_custom_client.apply_async(args=[custom_client.pk, download_id])
        cache_key = get_custom_client_package_key(custom_client.pk, download_id)
        PACKAGES_CACHE[cache_key] = {"file": None, "is_ready": False, "task_id": str(task_id)}
        return api_success({'downloadId': download_id})

    def get_download_package(self, request, pk):
        serializer = PackageDownloadIdSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        download_id = serializer.validated_data['downloadId']

        return PACKAGES_CACHE.get(get_custom_client_package_key(pk, download_id))

    @swagger_auto_schema(query_serializer=PackageDownloadIdSerializer())
    @action(detail=True, serializer_class=CheckPackageCustomClientSerializer)
    def check_package(self, request, pk=None):
        # Get object to make sure it exists and user has access
        custom_client = self.get_object()
        package = self.get_download_package(request, custom_client.pk)
        if not package:
            raise APINotFoundException('Package not available')
        task = AsyncResult(package.get('task_id'))
        serializer = CheckPackageCustomClientSerializer(task)
        return api_success(serializer.data)

    @swagger_auto_schema(query_serializer=PackageDownloadIdSerializer())
    @action(detail=True)
    def download_package(self, request, pk=None):
        custom_client = self.get_object()
        package = self.get_download_package(request, custom_client.pk)
        if not package:
            raise APINotFoundException('Package not available')
        file_name = slugify(f'{custom_client.name}-package-{datetime.now()}') + '.zip'
        return response_attachment(package['file'], file_name, 'application/zip', attachment=True)
