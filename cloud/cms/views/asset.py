from functools import wraps
from collections import defaultdict, OrderedDict
from contextlib import suppress
from django.core.files import base
from django.db.models.expressions import OuterRef, Subquery

from util.base_cache import IntegrationCache
from util.config import UnableToFetchConfigException
from waffle import flag_is_active
from cms.controllers.asset_json import get_contexts_and_datastructures_of_asset_type
from cms.views.celery import download_result
from util import helpers
from django.views.decorators.http import require_http_methods
from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import permission_required
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from django import urls, shortcuts
from django.utils.text import slugify
from django.utils.html import format_html
from django.contrib import admin
from django.http.response import HttpResponse, HttpResponseBadRequest
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.exceptions import APIException
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from celery import result
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema, no_body
from queue import SimpleQueue
from waffle.mixins import WaffleFlagMixin

from cloud.helpers.exceptions import APINotFoundException, APIForbiddenException, api_success, handle_exceptions, require_params
from cms.helpers.permissions import make_customization_visible_to_user
from cms.controllers import filldata, generate_structure, modify_db, structure, structure_to_html, documentation, zendesk
from cms.forms import *
from cms.models import PackagesCache, UserGroupsToAssetPermissions
from cms.permissions import IsSuperuser
from cms.serializers import AssetManifestSerializer, AssetSerializer, CustomClient, CustomClientSerializer, \
    ContentManifestSerializer, GenerateCustomClientSerializer, CheckPackageCustomClientSerializer, \
    PackageDownloadIdSerializer
from cms import tasks

from ..controllers.documentation import DocumentCache

DRAFT = Asset.PREVIEW_STATUS[Asset.PREVIEW_STATUS.draft]
PACKAGES_CACHE = PackagesCache()


def make_package_name(asset: Asset):
    return f"{asset.customizations.first()if asset.is_vms else asset.name}.zip"


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
            data_record = data_structure.datarecord_set.filter(
                asset=asset).order_by('created_date').last()

            if data_record:
                db_record_value = data_record.value

            if request_data[ds_name] != db_record_value:
                return True

    return False


# Handles when users save, create previews, or create reviews
def context_editor_action(request, asset, context_id, language_code):
    context, language = get_context_and_language(
        request, context_id, language_code, asset.default_language)

    request_data = request.POST
    request_files = request.FILES

    if not UserGroupsToAssetPermissions.check_edit_advanced(request.user, asset)\
            and advanced_touched_without_permission(request_data, context.datastructure_set.all(), asset):
        raise PermissionDenied

    context_states, changed = check_context_changed(request_data)

    if changed:
        return handle_editor_action(
            language,
            request_data,
            asset,
            context,
            request_files,
            request,
            **context_states
        )

    return '', [], []


CONTEXT_CHANGED_LOOKUP = {
    'language_changed': "languageChanged",
    'preview': "Preview",
    'save_draft': "SaveDraft",
    'send_review': "SendReview"
}


def check_context_changed(request_data):
    context_states = {
        key: value in request_data for key,
        value in CONTEXT_CHANGED_LOOKUP.items()
    }
    return context_states, any(context_states.values())


def handle_editor_action(language, request_data, asset, context, request_files, request, language_changed, send_review, preview, save_draft):
    upload_errors = save_records(
        language, request_data, language_changed, asset, context, request_files, request)

    if send_review:
        asset_errors, saved_msg = handle_send_for_review(
            upload_errors, request, asset)
    else:
        saved_msg = "Changes have been saved."
        asset_errors = []

    if upload_errors or asset_errors:
        add_upload_error_messages(
            request, "Upload error for {}. {}", upload_errors)
        add_upload_error_messages(
            request, "Asset error for {}. {}", asset_errors)
        preview_link = ''
    else:
        preview_link = generate_preview(
            asset, language, preview, save_draft, send_review, saved_msg, context, request)
    return preview_link, upload_errors, asset_errors


def save_records(language, request_data, language_changed, asset, context, request_files, request):
    current_lang = language
    request_lang = request_data.get('currentLanguage')
    if language_changed and request_lang:
        current_lang = Language.by_code(request_lang)

    return modify_db.save_unrevisioned_records(
        asset, context, current_lang, context.datastructure_set.all(), request_data, request_files, request.user, request=request)


def generate_preview(asset, language, preview, save_draft, send_review, saved_msg, context, request):
    # To cache documentation and verify that html body can be parsed correctly
    preview_link = ''
    if asset.asset_type.type == AssetType.ASSET_TYPES.documentation:
        documentation.generate_doc_json(
            [asset], language=language, draft=preview or save_draft, review=send_review
        )

    if preview:
        if asset.can_preview_on_portal:
            if asset.is_dirty:
                saved_msg += " Preview has been created."
                asset.change_preview_status(asset.PREVIEW_STATUS.draft)
                preview_link = modify_db.generate_preview_link(
                    context, asset, state=DRAFT)
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

    return preview_link


CANNOT_SEND_FOR_REVIEW_WITH_ERRORS = "Cannot have any errors when sending for review."
CANNOT_SEND_FOR_REVIEW_NO_CHANGES = "Cannot send for review no value was changed for this asset."
NEW_VERSION_CREATED = "A new version has been created."


def handle_send_for_review(upload_errors, request, asset):
    saved_msg = ""
    asset_errors = []
    error_msg = ''
    if upload_errors:
        error_msg = CANNOT_SEND_FOR_REVIEW_WITH_ERRORS
    elif not asset.is_dirty:
        error_msg = CANNOT_SEND_FOR_REVIEW_NO_CHANGES
    else:
        asset_errors = modify_db.send_version_for_review(asset, request.user)
        asset.change_preview_status(asset.PREVIEW_STATUS.review)
        saved_msg = NEW_VERSION_CREATED

    if error_msg:
        messages.warning(request, f"{asset.name} - {error_msg}")

    return asset_errors, saved_msg


# Create your views here.
@require_http_methods(["POST"])
@permission_required('cms.edit_content')
def page_editor(request):
    from django.shortcuts import redirect
    asset = Asset.objects.get(id=request.POST['asset_id'])
    context_id = request.POST['context_id']
    language_code = request.POST.get('language')

    if not UserGroupsToAssetPermissions.check_asset_edit_content(request.user, asset):
        raise PermissionDenied

    preview_link, context_errors, asset_errors = context_editor_action(
        request, asset, context_id, language_code)
    if asset_errors:
        return redirect(asset_errors[0][2]), context_errors

    if "SendReview" in request.POST and not context_errors and not asset_errors:
        customization_reviews = AssetCustomizationReview.objects.\
            filter(state=AssetCustomizationReview.REVIEW_STATES.pending,
                   version_id=ContentVersion.objects.filter(asset=asset).latest('created_date'))

        # If the current customization is in the list of reviews go to that one.
        # Otherwise go to the first customization in the list of reviews.
        try:
            customization_review = customization_reviews.get(
                customization__name=request.CUSTOMIZATION)
        except AssetCustomizationReview.DoesNotExist:
            customization_review = customization_reviews.first()

        if customization_review:
            redirect_url = urls.reverse(
                'admin:cms_assetcustomizationreview_change', args=(customization_review.id,))
            return redirect(redirect_url), []

    return preview_link, context_errors


CAN_ONLY_ACCEPT_INTEGRATIONS_AND_ARTICLES = 'Can only accept integrations and articles'
REVIEW_NOT_EXIST = "Review doesn't exist"
CANT_ACCEPT = "Can't accept this review"


@api_view(['POST'])
@permission_classes((IsAdminUser,))
@handle_exceptions
def accept_review(request):
    review_id = request.data.get('review_id')
    asset_review = AssetCustomizationReview.objects.filter(
        id=review_id).first()
    if not asset_review:
        raise APINotFoundException(REVIEW_NOT_EXIST)

    asset = asset_review.version.asset
    customization = asset_review.customization

    if asset.asset_type.type not in [
        AssetType.ASSET_TYPES.integration, AssetType.ASSET_TYPES.documentation, AssetType.ASSET_TYPES.article
    ]:
        raise APIForbiddenException(CAN_ONLY_ACCEPT_INTEGRATIONS_AND_ARTICLES)

    has_asset_type_permission = UserGroupsToAssetType.check_asset_type(
        request.user, asset.asset_type, 'cms.publish_version'
    )
    can_accept = has_asset_type_permission and UserGroupsToAssetPermissions.check_customization_publish(
        request.user, customization=customization.name,
    )

    if can_accept and asset_review.state == AssetCustomizationReview.REVIEW_STATES.pending:
        modify_db.update_draft_state(
            review_id, AssetCustomizationReview.REVIEW_STATES.accepted, request.user)
        return api_success('Accepted')

    raise APIForbiddenException(CANT_ACCEPT)


def publish_review(request, target_review, target_customization='', message=True):
    asset = target_review.version.asset
    customization = target_review.customization.name
    target_review_id = target_review.id
    menu_cache = MenuCache(request=request)
    customization_cache = menu_cache[customization]
    if customization_cache:
        menus = {node.get_parent() for node in asset.nodes.all()}
        if len(menus):
            menu_cache[customization] = None
    if asset.is_cloud_portal:
        # Integration cache does not allow partial initiation, all attributes needed for lookup
        # generation must be set.
        # IntegrationCache(lookup_key='integrations', customization_required=False).clear_cache()
        # Todo. Using direct cache call instead. Replace it when fixed.
        caches['integrations'].clear()
        if not asset.can_preview_on_portal:
            return 'success', f'Version {target_review.version.id} has been published'

        publishing_errors = modify_db.publish_latest_version(
            asset, target_review_id, request.user)

        if publishing_errors:
            return 'error', f'Version {target_review.version.id} {publishing_errors}'
        else:
            return 'success', f'Version {target_review.version.id} has been published'
    else:
        modify_db.update_draft_state(
            target_review_id, AssetCustomizationReview.REVIEW_STATES.accepted, request.user)
        if asset.is_documentation:
            # Menu and Documentation caches must be cleared together
            MenuCache(customization_name=request.CUSTOMIZATION).clear_cache()
            zd_articles = ZendeskArticle.objects.filter(
                asset__id=asset.id, site__customization__name=target_customization)
            if zd_articles:
                zd_articles.update(needs_sync=True)
            if flag_is_active(request, FLAGS.zendesk_sync) and request.user.is_superuser:
                from cms.tasks import async_zendesk_push_article
                async_zendesk_push_article.apply_async(
                    args=[asset.id],
                    kwargs={'customization': target_customization},
                    queue='celery')
        if message:
            return 'success', f"Version {target_review.version.id} has been accepted"
    return None, None


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


def manage_release_note_notification(asset_review):
    asset = asset_review.version.asset
    if asset.asset_type.type == AssetType.ASSET_TYPES.release_notes:
        create_or_update_notification_for_release_note(
            asset, asset_review.version, customization=asset_review.customization)


def create_or_update_notification_for_release_note(asset, version, *, customization=None, request=None):
    customization = customization or getattr(request, 'CUSTOMIZATION', customization_ctx.get())
    _, datastructures = get_contexts_and_datastructures_of_asset_type(
        AssetType.ASSET_TYPES.release_notes)
    datastructures = DataStructure.find_actual_values(
        datastructures, asset=asset, version_id=version,
        customization_name=customization, draft=True
    )

    build_ds = next(filter(lambda ds: ds.name ==
                           "%build%", datastructures.keys()))
    build_raw = PortalNotification.calc_build(datastructures[build_ds])
    portal_notification = PortalNotification.objects.filter(
        build_raw=build_raw).first() or PortalNotification()

    # Do not create if all fields are blank
    if all(not datastructures[datastructure] or datastructure.name == '%build%' for datastructure in datastructures.keys()):
        if(portal_notification.id):
            portal_notification.delete()
        return

    updated_message = "Cloud Portal Has been Updated. See what’s new"

    notification_dict = {
        'title': updated_message,
        'body': updated_message,
        'build': datastructures[build_ds],
        'max_ts': datetime.now() + timedelta(weeks=2)
    }

    for key, val in notification_dict.items():
        setattr(portal_notification, key, val)
    portal_notification.save()


def defer_handler(func):
    @wraps(func)
    def _wrap_handler(*args, **kwargs):
        @wraps(func)
        def _inner_handler():
            return func(*args, **kwargs)
        return _inner_handler

    return _wrap_handler


@defer_handler
def handle_force_update(request, asset_review):
    if "force_update" in request.POST:
        asset = asset_review.version.asset
        if asset.is_cloud_portal and asset.can_preview_on_portal and UserGroupsToAssetPermissions.check_customization_permission(request.user, asset.customizations.first().name, 'cms.force_update'):
            filldata.init_skin(asset, preview=False)
            filldata.init_skin(asset, preview=True)
            return 'success', f'Version {asset_review.version.id} was force updated'
        else:
            return 'error', 'You cannot force update this asset'


@defer_handler
def handle_publish_single_customization(request, asset_review, can_publish, has_asset_type_permission):
    if not all(["publish" in request.POST, can_publish, has_asset_type_permission]):
        return

    manage_release_note_notification(asset_review)

    return publish_review(request, asset_review, asset_review.customization.name)


@defer_handler
def handle_publish_all_customizations(request, asset_review, can_publish, has_asset_type_permission):
    if not all(["publish_all" in request.POST, can_publish, has_asset_type_permission]):
        return

    manage_release_note_notification(asset_review)

    reviews = asset_review.version.assetcustomizationreview_set. \
        filter(customization__in=asset_review.version.asset.customizations.all())
    if not request.user.is_superuser:
        reviews = reviews.filter(
            customization__name__in=request.user.customizations)
    accepted = []
    for target_review in review_generator(reviews):
        if UserGroupsToAssetPermissions.check_customization_publish(request.user, customization=target_review.customization.name):
            publish_review(
                request, target_review, target_customization=target_review.customization.name, message=False)
            accepted.append(target_review.customization)
    accepted_customization_portals = list(Asset.objects.filter(
        customizations__in=accepted, asset_type__type=AssetType.ASSET_TYPES.cloud_portal).values_list('name', flat=True))
    return 'success', f"Version {asset_review.version.id} has been accepted for {', '.join(accepted_customization_portals)}"


@defer_handler
def handle_revoke(request, asset_review, can_publish):
    if "revoke" not in request.POST or not can_publish:
        return

    asset = asset_review.version.asset
    review_id = request.POST.get('review_id')

    if asset.is_cloud_portal and not asset.can_preview_on_portal:
        return 'error', f"Cannot revoke on this portal"

    if asset.is_cloud_portal:
        modify_db.publish_latest_version(asset_review.version.asset, review_id, request.user,
                                         AssetCustomizationReview.REVIEW_STATES.rejected)
    else:
        modify_db.update_draft_state(
            review_id, AssetCustomizationReview.REVIEW_STATES.rejected, request.user)

    return 'success', f"Version {asset_review.version.id} has been revoked"


@defer_handler
def handle_reject_or_ask(request, asset_review):
    customization = request.CUSTOMIZATION
    if "ask_question" not in request.POST and "reject" not in request.POST:
        return

    message_to_display = [None, None]
    if "reject" in request.POST:
        review_id = request.POST.get('review_id')
        if not UserGroupsToAssetPermissions.check_customization_publish(request.user, customization=customization):
            raise PermissionDenied
        modify_db.update_draft_state(
            review_id, AssetCustomizationReview.REVIEW_STATES.rejected, request.user)
        message_to_display = 'success', f"Version {asset_review.version.id} has been rejected"
        asset_review = AssetCustomizationReview.objects.get(id=review_id)

    if "access_customization" in request.POST:
        make_customization_visible_to_user(get_cloud_portal_asset(customization=asset_review.customization),
                                           asset_review.version.created_by)

    note = request.POST["addedNote"]
    message = f'\n{request.user.email}: {note}\n'
    if not UserGroupsToAssetPermissions.\
            check_customization_access(asset_review.version.created_by, customization=asset_review.customization):
        message = f'\nMessage: {note}\n'
    asset_review.notes += message
    asset_review.save()

    return message_to_display


@defer_handler
def handle_invalid_permissions(request):
    if any(action in request.POST for action in ['force_update', 'publish', 'revoke']):
        raise PermissionDenied


@defer_handler
def handle_invalid_option():
    return 'error', 'Invalid option selected'


def get_review_arguments(request):
    review_id = request.POST.get('review_id')
    customization = request.CUSTOMIZATION
    asset_review = AssetCustomizationReview.objects.filter(
        id=review_id).first()
    can_publish = asset_review and UserGroupsToAssetPermissions.check_customization_publish(
        request.user, customization=customization)
    has_asset_type_permission = asset_review and UserGroupsToAssetType.check_asset_type(
        request.user, asset_review.version.asset.asset_type, 'cms.publish_version'
    )

    return asset_review, can_publish, has_asset_type_permission


def handle_display_message(request, message_tuple):
    level, message = message_tuple
    send_message = level and message
    if send_message:
        getattr(messages, level)(request, message)
    return send_message


@require_http_methods(["POST"])
@permission_required("cms.change_assetcustomizationreview")
def review(request):
    message_to_display = [None, None]
    asset_review, can_publish, has_asset_type_permission = get_review_arguments(
        request)

    if not asset_review:
        return HttpResponseBadRequest("Version does not exist")

    handlers = [
        handle_force_update(request, asset_review),
        handle_publish_single_customization(
            request, asset_review, can_publish, has_asset_type_permission),
        handle_publish_all_customizations(
            request, asset_review, can_publish, has_asset_type_permission),
        handle_revoke(request, asset_review, can_publish),
        handle_reject_or_ask(request, asset_review),
        handle_invalid_permissions(request),
        handle_invalid_option()
    ]

    for handler in handlers:
        if message_to_display := handler():
            handle_display_message(request, message_to_display)
            return


@require_http_methods(["POST"])
@permission_required('cms.change_assetcustomizationreview')
def make_preview(request):
    version_id = request.POST.get('version_id')
    context = Context.objects.filter(id=request.POST['context_id']).first()
    asset = get_asset_by_revision(version_id)
    customization = request.CUSTOMIZATION

    if not UserGroupsToAssetPermissions.check_asset_edit_content(request.user, asset) and \
            not UserGroupsToAssetPermissions.check_customization_publish(request.user, customization=customization):
        raise PermissionDenied

    if asset.can_preview_on_portal:
        redirect_url = modify_db.generate_preview(
            asset, context, version_id=version_id, send_to_review=True)
        asset.change_preview_status(asset.PREVIEW_STATUS.review)
    else:
        review = AssetCustomizationReview.objects.get(version_id=version_id,
                                                      customization=asset.customizations.first())
        redirect_url = urls.reverse(
            'admin:cms_assetcustomizationreview_change', args=(review.id,))
        messages.error(request, "This asset can not be previewed")

    return HttpResponse(redirect_url)


def response_attachment(data, filename, content_type, attachment=False):
    response = HttpResponse(data, content_type=content_type)
    response['Content-Disposition'] = f'{"attachment; " if "application" in content_type or attachment else ""}filename={filename}'
    response.set_cookie('filename', filename, max_age=10)
    return response


asset_settings_wiki = "For more information please go to " \
                      "https://networkoptix.atlassian.net/wiki/spaces/PM/pages/1183057641/Asset+Settings"


def handle_settings_from_json(request, is_loaded, form, file, asset):
    if not isinstance(file, (list, dict)) and not file.name.endswith('json'):
        return

    PACKAGE_CACHE = PackagesCache()
    skip = False
    conflicts = []
    force = form.cleaned_data['force']
    action = form.cleaned_data['action']
    update_asset_by_json = action == 'update_asset_by_json'
    import_assets_from_json = action in (
        'import_assets_from_json', 'import_assets_from_json_publish')
    import_assets_from_json_publish = action == 'import_assets_from_json_publish'
    update_structure = action == 'update_structure'
    loaded_json = file if is_loaded else json.load(file)
    if not force and (update_asset_by_json or import_assets_from_json):
        conflicts = structure.check_asset_conflicts(loaded_json)
        if conflicts:
            skip = True
            PACKAGE_CACHE[action] = loaded_json
            messages.warning(
                request, 'Some assets contain conflicts with existing records. To force update with new values please check the "Force Update" checkbox.')
    if skip:
        pass
    elif update_asset_by_json:
        structure.update_asset_by_json(
            asset, loaded_json[0], request.user)
        messages.success(request, "Content updated")
    elif import_assets_from_json:
        json_cache_id = uuid.uuid4()
        PACKAGE_CACHE[json_cache_id] = loaded_json
        task = tasks.async_import_assets_from_json.apply_async(
            args=[json_cache_id, request.user.id, import_assets_from_json_publish],
            kwargs={'customization': request.CUSTOMIZATION},
            queue='celery')
        messages.info(request, 'Starting assets import')
        return [task, None, conflicts]
    elif update_structure:
        cms_structure = loaded_json
        if type(cms_structure) == list and len(cms_structure) > 1:
            messages.warning(request, "You can only update one asset_type at a time. "
                             "Only the first asset type from structure.json was used.")
        structure.update_from_object(
            cms_structure, asset_type=asset.asset_type, preserve_files=True)
        messages.success(request, "Structure updated")
    else:
        return [None, HttpResponseBadRequest('json is acceptable only for Updating structure'), conflicts]

    return [None, None, conflicts]


def handle_settings_from_zip(request, form, file, asset):
    if not file.name.endswith('zip'):
        return HttpResponseBadRequest('zip archive is expected')

    action = form.cleaned_data['action']

    if action == 'generate_json':
        data, log_messages = generate_structure.from_zip(file, asset)
        content = json.dumps(
            data, ensure_ascii=False, indent=4, separators=(',', ': '))
        for error in log_messages:
            messages.error(
                request, f'Error with {error["file"]} problem with {error["extension"]}')
        return response_attachment(content, 'structure.json', 'application/json')

    elif action == 'merge_with_db':
        data = generate_structure.merge_db_with_archive(file, asset)
        content = json.dumps(
            data, ensure_ascii=False, indent=4, separators=(',', ': '))
        return response_attachment(content, 'structure.json', 'application/json')

    else:
        log_messages = structure.process_zip(
            file, request.user, asset, action == 'update_structure', action == 'update_content')

        for item in log_messages:
            log_type = {
                'info': messages.INFO,
                'error': messages.ERROR,
                'debug': messages.DEBUG,
                'success': messages.SUCCESS,
                'warning': messages.WARNING,
            }[item[0]]
            messages.add_message(request, log_type, item[1])


def handle_settings_file(request, form, file, asset):
    if handler_result := handle_settings_from_json(request, False, form, file, asset):
        return handler_result

    task_id = None
    response = handle_settings_from_zip(request, form, file, asset)
    conflicts = []

    return task_id, response, conflicts


def get_settings_from_request(request, obj_id, target_class=Asset):
    PACKAGE_CACHE = PackagesCache()
    form = AssetSettingsForm(request.POST, request.FILES,
                             user=request.user, target_class=target_class)
    instance = target_class.objects.get(pk=obj_id)
    is_asset_type = isinstance(instance, AssetType)
    asset = instance.asset_set.first() if is_asset_type else instance
    asset_type = instance if is_asset_type else instance.asset_type
    file = request.FILES.get('file', None)
    form = form if form.is_valid() else None

    if form and not file:
        file = PACKAGE_CACHE[
            form.cleaned_data['action']
        ]

    context = {
        'instance': instance,
        'instance_type': target_class.__name__,
        'asset': asset or Asset(asset_type=asset_type),
        'asset_type': asset_type,
        'form': form if file else None,
        'conflicts': [],
        'file': file.name if file and not isinstance(file, (list, dict)) else '',
        'user': request.user,
        'has_permission': admin.site.has_permission(request),
        'site_url': admin.site.site_url,
        'site_header': admin.site.site_header,
        'site_title': admin.site.site_title,
        'task_id': '',
        'title': f'Settings for {instance.name or instance}',
        'type_settings': is_asset_type
    }
    return asset, file, context, form


def render_settings(request, instance_id, target_class=Asset):
    asset, file, context, * \
        _ = get_settings_from_request(
            request, instance_id, target_class=target_class)

    if context['form']:
        task_id, response, asset_name_conflicts = handle_settings_file(
            request, context['form'], file, asset)

        if task_id:
            context['task_id'] = task_id

        if asset_name_conflicts:
            context['conflicts'] = asset_name_conflicts

        if response:
            return response

    else:
        context['form'] = AssetSettingsForm(
            user=request.user, target_class=target_class)

    if context['form'].is_valid() and not context['form'].cleaned_data['force']:
        messages.info(request, 'Checking asset names...')

    return shortcuts.render(request, 'cms/asset_settings.html', context)


@swagger_auto_schema(methods=["GET", "POST"], operation_description=asset_settings_wiki, auto_schema=None)
@api_view(["GET", "POST"])
@permission_classes((IsSuperuser,))
def asset_settings(request, asset_id):
    return render_settings(request, asset_id)


@swagger_auto_schema(methods=["GET", "POST"], operation_description=asset_settings_wiki, auto_schema=None)
@api_view(["GET", "POST"])
@permission_classes((IsSuperuser,))
def asset_type_settings(request, asset_type_id):
    return render_settings(request, asset_type_id, AssetType)


@api_view(["GET", "POST"])
@permission_required('cms.change_asset')
def download_current_structure(request, asset_id):
    output_format = request.query_params.get("output_format", "json")
    asset = Asset.objects.get(id=asset_id)
    cache_key = tasks.get_package_cache_key(
        asset, structure_format=output_format)
    structure_info = PACKAGES_CACHE.get(cache_key)
    if not structure_info:
        use_actual_values = "get_values" in request.query_params
        task = tasks.make_structure.apply_async(
            kwargs={'asset_id': asset_id, 'output_format': output_format,
                    'use_actual_values': use_actual_values, 'user_id': request.user.id,
                    'customization': request.CUSTOMIZATION},
            queue='celery')
        PACKAGES_CACHE[cache_key] = {"file": None,
                                     "is_ready": False, "task_id": str(task)}
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

    param_id, *param_name_segments = asset_param.split('-')
    param_name = '-'.join(param_name_segments)

    if not param_id.isdigit():
        return matchobj.group(0)

    asset_id = int(param_id)
    asset = Asset.objects.filter(
        id=asset_id, asset_type__type=AssetType.ASSET_TYPES.documentation).first()
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


INTERNAL_DOC_REGEX = re.compile(
    r'(href=\"(?:[./]*?|%CLOUD_LINK%/)docs/)(.*?)(\")')


def prepare_doc_urls(asset_dict):
    contexts = asset_dict.get('contexts', [])
    content_context = next(
        (context for context in contexts if context.get('name', '') == 'content'), [])
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
    last_asset = Asset.objects.filter(
        asset_type__type=asset_type).latest('contentversion')
    cache_key = f'all-asset-structures-{asset_type}-{last_asset.id}-{last_asset.version_id()}'
    asset_type_name = AssetType.objects.filter(type=asset_type).first()
    structure_info = PACKAGES_CACHE.get(cache_key)
    if not structure_info:
        task = tasks.make_structure.apply_async(
            kwargs={'asset_type': asset_type, 'user_id': request.user.id,
                    'customization': request.CUSTOMIZATION},
            queue='celery')
        PACKAGES_CACHE[cache_key] = {"file": None,
                                     "is_ready": False, "task_id": str(task)}
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
    file = filldata.read_customized_file(
        path, asset, language_code, version_id, preview)
    if file:
        return response_attachment(file, os.path.basename(path), "image/png" if show_image else "application")
    return HttpResponseBadRequest("File does not exist")


asset_id__route_param = openapi.Parameter(
    "asset_id", openapi.IN_PATH, type=openapi.TYPE_STRING)
draft__query_param = openapi.\
    Parameter("draft", openapi.IN_QUERY,
              description="Specifics if a draft or published version of the asset should be returned",
              type=openapi.TYPE_STRING)
version_id__query_param = openapi.Parameter(
    "version_id", openapi.IN_QUERY, type=openapi.TYPE_STRING)


@swagger_auto_schema(method="GET", auto_schema=None,
                     operation_description="Download data records for a given asset",
                     manual_parameters=[asset_id__route_param, draft__query_param, version_id__query_param])
@api_view(["GET"])
@permission_classes((IsAuthenticated, ))
def download_package(request, asset_id):
    if not request.user.has_perm("cms.can_download_package"):
        raise PermissionDenied

    asset = Asset.objects.get(id=asset_id)
    version_id = request.GET.get('version_id')
    preview = 'draft' in request.GET
    package_args = asset, preview, version_id

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

    if package_info := handle_cloud_portal_and_vms_package(*package_args, customization=request.CUSTOMIZATION):
        return api_success(package_info)
    else:
        zipped_data = filldata.PackageExporter(*package_args).get_zip_package()
        return response_attachment(zipped_data, make_package_name(asset), "application/zip")


def handle_cloud_portal_and_vms_package(asset, preview, version_id, customization=None):
    if not asset.is_cloud_portal and not asset.is_vms:
        return None
    cache_key = tasks.get_package_cache_key(asset, preview, version_id)
    package_info = PACKAGES_CACHE.get(cache_key)
    if not package_info:
        task = tasks.make_package.apply_async(
            args=[asset.id, preview, version_id],
            kwargs={'customization': customization or customization_ctx.get()},
            queue='celery'
        )
        PACKAGES_CACHE[cache_key] = {
            "file": None, "is_ready": False, "task_id": str(task)}
        return {"msg": "Building the package", "is_ready": False, "task_id": str(task)}
    is_ready = package_info.get("is_ready")
    return {"msg": "Package is ready" if is_ready else "Package is not ready", "is_ready": is_ready, "task_id": package_info.get("task_id")}


@api_view(["GET"])
@permission_classes((IsAuthenticated, ))
def download_async_package(request, asset_id):
    if not request.user.has_perm("cms.can_download_package"):
        raise PermissionDenied

    asset = Asset.objects.get(id=asset_id)
    if not asset.customizations.exists():
        raise APIForbiddenException("Asset must contain at least one customization.")

    version_id = request.GET.get('version_id')
    preview = 'draft' in request.GET

    cache_key = tasks.get_package_cache_key(asset, preview, version_id)
    package_info = PACKAGES_CACHE.get(cache_key)
    if not package_info:
        return api_success({"msg": "No package is being made"})
    elif not package_info.get("is_ready"):
        return api_success({"msg": "Package is not ready"})
    else:
        zipped_data = PACKAGES_CACHE[cache_key]
        return response_attachment(zipped_data.get("file"), make_package_name(asset), "application/zip")


@api_view(["POST"])
@permission_classes((IsAuthenticated, ))
def upload_image(request, asset_id, ds_id, content_uuid=None):
    file = request.data.get('file')
    content_file = base.File(
        file, name=f'{ds_id}-{content_uuid or uuid.uuid4()}.' + file.name.split('.')[-1].lower())
    asset = Asset.objects.filter(id=asset_id).first()
    ds = DataStructure.objects.filter(id=ds_id).first()
    ext_file = ExternalFile.objects.create(
        asset=asset, data_structure=ds, file=content_file)

    return api_success({'location': ext_file.file.url})


customization__query_param = openapi.Parameter(
    "customization", openapi.IN_QUERY, type=openapi.TYPE_STRING)
name__query_param = openapi.Parameter(
    "name", openapi.IN_QUERY, required=True, type=openapi.TYPE_STRING)
type__query_param = openapi.Parameter(
    "type", openapi.IN_QUERY, required=True, type=openapi.TYPE_STRING)


@swagger_auto_schema(method="GET", auto_schema=None,
                     operation_description="Returns a list of asset ids based on an asset type.",
                     manual_parameters=[customization__query_param, name__query_param, type__query_param])
@api_view(["GET"])
@permission_classes((IsAuthenticated, ))
def get_asset_ids_by_asset_type(request):

    if not request.user.has_perm("cms.can_download_package"):
        raise PermissionDenied

    require_params(request, ("name", "type"))

    name = request.GET["name"]
    customization = request.GET["customization"]
    asset_type_type = AssetType.get_type_by_name(request.GET["type"])
    asset_type = AssetType.objects.filter(
        name=name, type=asset_type_type).first()
    if not asset_type:
        raise APINotFoundException("Could not find a matching asset type")

    asset_ids = asset_type.asset_set.values_list('id', flat=True)
    if customization:
        asset_ids = asset_ids.filter(customizations__name__in=[customization])

    return api_success(list(asset_ids))


class MenuAssetAutocomplete(autocomplete.Select2QuerySetView):
    def get_queryset(self):
        # Don't forget to filter out results depending on the visitor !
        if not self.request.user.is_staff:
            return Asset.objects.none()

        qs = Asset.objects.filter(
            asset_type__type__in=[
                AssetType.ASSET_TYPES.documentation, AssetType.ASSET_TYPES.integration]
        )
        if not self.request.user.is_superuser:
            qs = qs.filter(customization__name__in=self.request.user.customizations_with_permission(
                'cms.publish_version'))

        if self.q:
            qs = qs.filter(name__icontains=self.q)
        return qs

    def create_object(self, text):
        doc_type = AssetType.objects.filter(
            type=AssetType.ASSET_TYPES.documentation, name='').order_by('pk').first()
        params = {
            'asset_type': doc_type,
            self.create_field: text
        }
        asset, created = self.get_queryset().get_or_create(**params)
        if created:
            asset.customizations.set(Customization.objects.all())
        return asset


def prepare_asset_info(request, customization, asset, ignore_error=False):
    review_url = None
    customization = customization or getattr(request, 'CUSTOMIZATION', customization_ctx.get())
    if (
        not request.user.is_superuser
        and not (
            UserGroupsToAssetPermissions.check_customization_publish(
                request.user,
                customization=customization
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
                review_url = helpers.get_admin_url(latest_review)
    else:
        state = None
    enabled_customizations_dict = {cust.id: cust.name for cust in asset.customizations.filter(
        name__in=request.user.customizations)}
    return {'state': state, 'customizations': enabled_customizations_dict, 'review_url': review_url}


@api_view(["GET"])
@permission_classes((IsAuthenticated, ))
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


def dict_to_nodes(to_transform, sort_children=True):
    if isinstance(to_transform, list):
        if sort_children:
            to_transform.sort(key=lambda item: item['name'])
        return to_transform
    return [{'name': name, 'children': dict_to_nodes(content, sort_children)} for name, content in to_transform.items()]


def build_up(target_dict, name, asset_type, include_preview=True, include_admin=True, *, customization=None, request=None):
    customization = customization or getattr(request, 'CUSTOMIZATION', customization_ctx.get())
    assets = Asset.objects.filter(
        asset_type__type=asset_type, customizations__name=customization)
    target_dict[name] = []

    for asset in assets:
        preview_links = [{
            'name': preview_name,
            'url': url,
            'type': 'preview'
        } for preview_name, url in modify_db.generate_preview_links(asset=asset)
            if url] if include_preview else []

        if len(preview_links) == 1:
            preview_links[0]['name'] = 'Preview'

        admin_links = [{
            'name': 'Asset Admin Link',
            'url': asset.admin_link,
            'type': 'settings'
        }] if include_admin else []

        target_dict[name] += [{
            'name': asset.name,
            'id': asset.id,
            'type': AssetType.ASSET_TYPES[asset_type],
            'url': (admin_links[0] if admin_links else {}).get('url', (preview_links[0] if preview_links else {}).get('url', asset.admin_link)),
            'actions': [
                *admin_links,
                *preview_links
            ]
        }]


@api_view(["GET"])
@permission_required('cms.change_asset')
def get_assets(request):
    max_age = int(request.GET.get('maxAge') or 0)
    customization = request.CUSTOMIZATION
    included_types = request.GET.getlist('type') or [
        'custom_clients', *[asset_type for asset_type in AssetType.ASSET_TYPES._identifier_map.keys()]]
    selected_type_ids = [asset_type_id for identifier in included_types if (
        asset_type_id := getattr(AssetType.ASSET_TYPES, identifier, ''))]

    preview = request.GET.getlist('preview') or included_types
    preview_type_ids = [asset_type_id for identifier in preview if (
        asset_type_id := getattr(AssetType.ASSET_TYPES, identifier, ''))]

    admin = request.GET.getlist('admin') or included_types
    admin_type_ids = [asset_type_id for identifier in admin if (
        asset_type_id := getattr(AssetType.ASSET_TYPES, identifier, ''))]

    asset_dict = OrderedDict()

    cache_key = '-'.join(str(val) for val in (
        [request.user.email] + selected_type_ids + preview_type_ids + admin_type_ids))
    cached = PACKAGES_CACHE.get(cache_key)

    if cached and cached['last'] > (datetime.utcnow() - timedelta(minutes=max_age)):
        return api_success({**cached, 'last': f'{cached["last"]}Z'})

    # Build up custom clients menu
    if 'custom_clients' in included_types:
        mapped_clients = defaultdict(lambda: [])
        custom_clients = request.user.customclient_set.filter(
            created_customization__name=customization)

        for client in custom_clients:
            settings_link = {
                'name': 'Custom Client Settings',
                'url': f'/developers/custom-clients/edit/{client.id}/information',
                'type': 'settings'
            }

            download_link = {
                'name': 'Download Package',
                'url': '/developers/custom-clients',
                'params': {'download': client.id},
                'type': 'download'
            }

            mapped_clients[client.base_vms.name] += [{
                'name': client.name,
                'id': client.id,
                'baseVmsId': client.base_vms.id,
                'type': 'custom_client',
                'url': settings_link['url'],
                'actions': [
                    settings_link,
                    download_link
                ]
            }]

        asset_dict['Custom Clients'] = mapped_clients

    asset_mapping = (
        ('Integrations', AssetType.ASSET_TYPES.integration),
        ('Documentation', AssetType.ASSET_TYPES.documentation),
        ('Agreements', AssetType.ASSET_TYPES.agreement),
        ('VMS', AssetType.ASSET_TYPES.vms)
    )

    for args in asset_mapping:
        if args[1] in selected_type_ids:
            build_up(asset_dict, *args,
                     include_preview=args[1] in preview_type_ids, include_admin=args[1] in admin_type_ids, customization=customization)

    cached = PACKAGES_CACHE[cache_key] = {
        'last': datetime.utcnow(), 'data': dict_to_nodes(asset_dict)}

    return api_success({**cached, 'last': f'{cached["last"]}Z'})


class CustomClientViewSet(WaffleFlagMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = CustomClientSerializer
    waffle_flag = FLAGS.custom_clients

    def get_queryset(self):
        if self.request.user.is_anonymous or getattr(self, 'swagger_fake_view', False):
            return CustomClient.objects.none()
        return self.request.user.customclient_set.filter(created_customization__name=self.request.CUSTOMIZATION)

    def perform_create(self, serializer):
        from cms.models import get_vms_asset
        kwargs = {}
        customization = self.request.CUSTOMIZATION
        if not settings.META:
            kwargs['base_vms'] = get_vms_asset(customization=customization)
        serializer.save(
            created_by=self.request.user,
            created_customization=Customization.objects.filter(
                name=customization).first(),
            **kwargs
        )

    @action(detail=False, serializer_class=ContentManifestSerializer)
    def get_manifest(self, request):
        return api_success({
            'manifest': {
                'contexts': self.generate_contexts_for_manifest(),
                'settings': self.generate_settings_for_manifest(request)
            }
        })

    @staticmethod
    def generate_settings_for_manifest(request):
        show_vms_list = settings.META
        vms_list = [{'name': vms.name, 'value': vms.id} for vms in
                    request.user.custom_client_vms_assets(request=request)] if show_vms_list else []

        return {
            'base_vms': {
                'label': 'Based on',
                'hidden': not show_vms_list,
                'options': vms_list
            }
        }

    @staticmethod
    def generate_contexts_for_manifest():
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
            AssetType.get_custom_fields_by_type(
                AssetType.ASSET_TYPES.vms).items()
        ))]

        return [{
            'name': 'information',
            'label': 'Information',
            'global': False,
            'fields': fields
        }]

    @swagger_auto_schema(method='post', request_body=no_body, responses={200: GenerateCustomClientSerializer()})
    @action(detail=True, methods=['post'])
    def generate_package(self, request, pk=None):
        # Get object to make sure it exists and user has access
        custom_client = self.get_object()
        download_id = uuid.uuid4()
        task_id = tasks.make_custom_client.apply_async(
            args=[custom_client.pk, download_id],
            kwargs={'customization': getattr(request, 'CUSTOMIZATION', customization_ctx.get())},
            queue='celery')
        cache_key = tasks.get_custom_client_package_key(
            custom_client.pk, download_id)
        PACKAGES_CACHE[cache_key] = {"file": None,
                                     "is_ready": False, "task_id": str(task_id)}
        return api_success({'downloadId': download_id})

    def get_download_package(self, request, pk):
        from cms.tasks import get_custom_client_package_key
        serializer = PackageDownloadIdSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        download_id = serializer.validated_data['downloadId']

        return PACKAGES_CACHE.get(get_custom_client_package_key(pk, download_id))

    @swagger_auto_schema(query_serializer=PackageDownloadIdSerializer())
    @action(detail=True, serializer_class=CheckPackageCustomClientSerializer)
    @handle_exceptions
    def check_package(self, request, pk=None):
        # Get object to make sure it exists and user has access
        custom_client = self.get_object()
        package = self.get_download_package(request, custom_client.pk)
        if not package:
            raise APINotFoundException('Package not available')
        task = result.AsyncResult(package.get('task_id'))
        serializer = CheckPackageCustomClientSerializer(task)
        return api_success(serializer.data)

    @swagger_auto_schema(query_serializer=PackageDownloadIdSerializer())
    @action(detail=True)
    def download_package(self, request, pk=None):
        custom_client = self.get_object()
        package = self.get_download_package(request, custom_client.pk)
        if not package:
            raise APINotFoundException('Package not available')
        file_name = slugify(
            f'{custom_client.name}-package-{datetime.now()}') + '.zip'
        return response_attachment(package['file'], file_name, 'application/zip', attachment=True)


class AssetViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = AssetSerializer

    def get_queryset(self):
        latest_version = Subquery(
            ContentVersion.objects.filter(asset_id=OuterRef('id')).order_by('pk').values('id')[:1])

        return Asset.objects.annotate(latest_version=latest_version).all()

    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    def save_asset(self, *args, **kwargs):
        kwargs.pop('partial', False)
        return self.create(*args, **kwargs)

    def update(self, *args, **kwargs):
        return self.save_asset(*args, **kwargs)

    def partial_update(self, *args, **kwargs):
        return self.save_asset(*args, **kwargs)

    @action(detail=False, serializer_class=AssetManifestSerializer)
    def manifests(self, request):
        asset_type_id = request.query_params.get('id', None)
        asset_type = asset_type_id and get_object_or_404(
            AssetType, id=asset_type_id)
        return api_success(AssetManifestSerializer.generate(asset_type or AssetType.objects.all(), True).data)

    @action(detail=True, serializer_class=AssetManifestSerializer)
    def manifest(self, request, pk=None):
        asset = self.get_object()
        return api_success(AssetManifestSerializer.generate(asset.asset_type, True).data)
