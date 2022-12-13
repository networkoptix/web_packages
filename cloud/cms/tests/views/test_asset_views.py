import pytest
from model_bakery import baker
from uuid import uuid4
from random import randint, choice
from django.conf import settings
from unittest.mock import call
from django.core.files.uploadedfile import SimpleUploadedFile

from cms.views.asset import *


def test_make_package_name(db):
    asset = baker.make(Asset, customizations=Customization.objects.filter(
        name=settings.CUSTOMIZATION))

    # Test non vms
    assert make_package_name(asset) == f"{asset.name}.zip"

    # Test vms
    asset.asset_type = AssetType.objects.filter(
        type=AssetType.ASSET_TYPES.vms).first()
    assert make_package_name(asset) == f"{settings.CUSTOMIZATION}.zip"


def test_get_context_and_language(mocker, db):
    mock_request = mocker.MagicMock()
    mock_request.session = {}
    test_context = baker.make(Context)
    default_language = Language.objects.first()
    test_language = baker.make(Language)

    # Test valid language
    context, language = get_context_and_language(
        mock_request, test_context.id, test_language.code, default_language)
    assert context == test_context
    assert language == test_language

    # Test invalid language
    context, language = get_context_and_language(
        mock_request, test_context.id, str(uuid4()), default_language)
    assert context == test_context
    assert language == default_language


def test_add_upload_error_messages(mocker):
    request, *errors = [(str(uuid4()), str(uuid4()))
                        for _ in range(randint(5, 50))]
    mock_message = mocker.MagicMock()
    mock_message.format = lambda x, y: f'{x} {y}'
    mock_messages_error = mocker.patch('django.contrib.messages.error')

    add_upload_error_messages(request, mock_message, errors)
    expected_error_calls = [
        call(error, f'{error[0]} {error[1]}') for error in errors]
    assert mock_messages_error.has_calls(expected_error_calls)


def test_advanced_touched_without_permission(db):
    default = str(uuid4())
    mock_ds = baker.make(DataStructure, advanced=True, default=default)
    asset = baker.make(Asset)
    request_data = {mock_ds.name: str(uuid4())}

    # Test advanced changed
    assert advanced_touched_without_permission(
        request_data, DataStructure.objects.all(), asset)

    # Test advanced not changed
    request_data[mock_ds.name] = default
    assert not advanced_touched_without_permission(
        request_data, DataStructure.objects.all(), asset)


def test_context_editor_action(mocker, arf, account_factory, db):
    data = {'Preview': True}
    mock_request_no_action = arf.post('', data={})
    mock_request_action = arf.post('', data=data)

    mock_request_no_action.user = mock_request_action.user = account_factory()
    mock_request_no_action.session = mock_request_action.session = {}
    mock_asset = baker.make(Asset)
    mock_language = baker.make(Language)
    mock_context = baker.make(Context)
    mock_handle_action_result = str(uuid4())
    mocker.patch(
        'cms.views.asset.handle_editor_action',
        return_value=mock_handle_action_result
    )

    # Test no actions
    result = context_editor_action(
        mock_request_no_action, mock_asset, mock_context.id, mock_language.code)
    assert result == ('', [], [])

    # Test has actions
    data['Preview'] = True
    result = context_editor_action(
        mock_request_action, mock_asset, mock_context.id, mock_language.code)
    assert result == mock_handle_action_result


def test_check_context_changed():
    # test no changes
    check_context_changed({}) == [{}, False]

    # test with each key
    for key, value in CONTEXT_CHANGED_LOOKUP.items():
        to_check = {value: True}
        expected_context_state = {key: True}
        check_context_changed(to_check) == [expected_context_state, True]


def test_handle_editor_action(mocker):
    language, request_data, asset, context, request_files, request, expected_review_saved_msg, expected_preview_link = [
        str(uuid4()) for _ in range(8)]
    language_changed = send_review = preview = save_draft = expected_upload_errors = False
    expected_asset_errors = []
    expected_upload_errors = []

    def get_args():
        return language, request_data, asset, context, request_files, request, language_changed, send_review, preview, save_draft

    mock_save_records = mocker.patch(
        'cms.views.asset.save_records', return_value=expected_upload_errors)
    mock_handle_send_for_review = mocker.patch('cms.views.asset.handle_send_for_review', return_value=[
                                               expected_asset_errors, expected_review_saved_msg])
    mock_add_upload_error_messages = mocker.patch(
        'cms.views.asset.add_upload_error_messages')
    mock_generate_preview = mocker.patch(
        'cms.views.asset.generate_preview', return_value=expected_preview_link)

    # Test no errors, no review
    preview_link, upload_errors, asset_errors = handle_editor_action(
        *get_args())
    assert preview_link == expected_preview_link
    assert not upload_errors
    assert not asset_errors
    mock_save_records.assert_called_once_with(
        language, request_data, language_changed, asset, context, request_files, request)
    mock_handle_send_for_review.assert_not_called()
    mock_add_upload_error_messages.assert_not_called()
    mock_generate_preview.assert_called_once_with(
        asset, language, preview, save_draft, send_review, "Changes have been saved.", context, request)

    # Test no errors send review
    send_review = True
    preview_link, upload_errors, asset_errors = handle_editor_action(
        *get_args())
    assert preview_link == expected_preview_link
    assert not upload_errors
    assert not asset_errors
    mock_save_records.assert_called_with(
        language, request_data, language_changed, asset, context, request_files, request)
    mock_handle_send_for_review.assert_called_once_with(
        upload_errors, request, asset)
    mock_add_upload_error_messages.assert_not_called()
    mock_generate_preview.assert_called_with(
        asset, language, preview, save_draft, send_review, expected_review_saved_msg, context, request)

    # Test with errors
    expected_asset_errors.append(str(uuid4()))
    expected_upload_errors.append(str(uuid4()))
    preview_link, upload_errors, asset_errors = handle_editor_action(
        *get_args())
    assert not preview_link
    assert upload_errors and upload_errors == expected_upload_errors
    assert asset_errors and asset_errors == expected_asset_errors
    expected_errors = [
        call(request, "Upload error for {}. {}", expected_upload_errors),
        call(request, "Asset error for {}. {}", expected_asset_errors)
    ]
    mock_add_upload_error_messages.assert_has_calls(expected_errors)


def test_save_records(mocker):
    language, asset, request_files, expected_return, data_structures, user = [
        str(uuid4()) for _ in range(6)]
    context, request = [mocker.MagicMock() for _ in range(2)]
    request_data = {}
    context.datastructure_set.all.return_value = data_structures
    request.user = user
    language_changed = False
    mock_save_unrevisioned_records = mocker.patch(
        'cms.controllers.modify_db.save_unrevisioned_records', return_value=expected_return)

    assert save_records(
        language, request_data, language_changed, asset, context, request_files, request
    ) == expected_return
    mock_save_unrevisioned_records.assert_called_once_with(
        asset, context, language, data_structures, request_data, request_files, user)


def test_generate_preview(mocker, db):
    non_doc_asset_type = choice(AssetType.objects.exclude(
        type=AssetType.ASSET_TYPES.documentation))
    doc_asset_type = AssetType.objects.get(
        type=AssetType.ASSET_TYPES.documentation)
    non_doc_asset = baker.make(Asset, asset_type=non_doc_asset_type)
    doc_asset = baker.make(Asset, asset_type=doc_asset_type)
    language, saved_msg, context, request, expected_preview_link = [
        str(uuid4()) for _ in range(5)]
    preview = save_draft = send_review = False
    mock_success = mocker.patch('django.contrib.messages.success')
    mock_generate_doc_json = mocker.patch(
        'cms.controllers.documentation.generate_doc_json')
    mock_add_upload_error_messages = mocker.patch(
        'cms.views.asset.add_upload_error_messages')
    mock_generate_preview_link = mocker.patch(
        'cms.controllers.modify_db.generate_preview_link', return_value=expected_preview_link)

    def get_args(asset=non_doc_asset, preview=preview, can_preview=True, changed=True):
        if preview:
            mocker.patch('cms.models.Asset.can_preview_on_portal', can_preview)
            mocker.patch('cms.models.Asset.is_dirty', changed)

        return asset, language, preview, save_draft, send_review, saved_msg, context, request

    # test no preview and non doc
    assert not generate_preview(*get_args())
    mock_success.assert_called_once_with(request, saved_msg)
    mock_add_upload_error_messages.assert_not_called()

    # test preview and doc dirty
    preview = True
    assert generate_preview(
        *get_args(asset=doc_asset, preview=preview)) == expected_preview_link
    mock_generate_doc_json.assert_called_once_with(
        [doc_asset], language=language, draft=preview, review=send_review)
    mock_generate_preview_link.assert_called_once_with(
        context, doc_asset, state=DRAFT)
    mock_success.assert_called_with(
        request, f'{saved_msg} Preview has been created.')
    mock_add_upload_error_messages.assert_not_called()

    # test not_dirty
    success_count = mock_success.call_count
    assert not generate_preview(
        *get_args(asset=doc_asset, preview=preview, changed=False))
    mock_add_upload_error_messages.assert_called_with(request, "{}", [
        ("Cannot create preview for this asset no value was changed.", "")
    ])
    assert success_count == mock_success.call_count

    # test can't create preview
    assert not generate_preview(
        *get_args(asset=doc_asset, preview=preview, can_preview=False))
    mock_add_upload_error_messages.assert_called_with(request, "{}", [
        ("Cannot create preview for this asset on this portal.", "")
    ])
    mock_success.assert_called_with(
        request, saved_msg)


def test_handle_send_for_review(mocker):
    expected_asset_errors, name, user = [str(uuid4()) for _ in range(3)]
    mock_warning = mocker.patch('django.contrib.messages.warning')
    mock_send_for_review = mocker.patch(
        'cms.controllers.modify_db.send_version_for_review', return_value=expected_asset_errors)
    mock_asset = mocker.MagicMock()
    mock_request = mocker.MagicMock()
    mock_request.user = user
    mock_asset.name = name

    # test upload errors
    assert handle_send_for_review(True, mock_request, mock_asset) == ([], '')
    mock_warning.assert_called_with(
        mock_request, f"{name} - {CANNOT_SEND_FOR_REVIEW_WITH_ERRORS}")
    mock_send_for_review.assert_not_called()

    # test not changed
    mock_asset.is_dirty = False
    assert handle_send_for_review(False, mock_request, mock_asset) == ([], '')
    mock_warning.assert_called_with(
        mock_request, f"{name} - {CANNOT_SEND_FOR_REVIEW_NO_CHANGES}")
    mock_send_for_review.assert_not_called()

    # test saved
    warning_count = mock_warning.call_count
    mock_asset.is_dirty = True
    assert handle_send_for_review(False, mock_request, mock_asset) == (
        expected_asset_errors, NEW_VERSION_CREATED)
    assert warning_count == mock_warning.call_count
    mock_send_for_review.assert_called_once_with(mock_asset, user)


def test_page_editor(mocker, arf, account_factory, db):
    user = account_factory()
    preview_link, context_errors, redirect_value, context, language, *asset_errors = [
        str(uuid4()) for _ in range(8)]
    mock_asset = baker.make(Asset)
    data = {'context_id': context,
            'language': language, 'asset_id': mock_asset.id}
    expected_context_editor_action = preview_link, context_errors, [
        asset_errors]
    mock_context_editor_action = mocker.patch(
        'cms.views.asset.context_editor_action', return_value=expected_context_editor_action)
    mock_redirect = mocker.patch(
        'django.shortcuts.redirect', return_value=redirect_value)

    def generate_request():
        mock_request = arf.post('', data=data)
        mock_request.data = data
        mock_request.user = user
        return mock_request

    # test permissions
    mock_check_asset_edit_content = mocker.patch(
        'cms.models.UserGroupsToAssetPermissions.check_asset_edit_content', return_value=False)

    pytest.raises(PermissionDenied, page_editor, generate_request())

    # test asset errors
    mock_check_asset_edit_content.return_value = True
    assert page_editor(generate_request()) == (redirect_value, context_errors)
    mock_redirect.assert_called_with(asset_errors[2])

    # test no asset errors
    mock_context_editor_action.return_value = preview_link, context_errors, []
    assert page_editor(generate_request()) == (preview_link, context_errors)


def test_accept_review(mocker, arf, account_factory, db):
    user = account_factory(is_staff=True)
    mock_review = baker.make(AssetCustomizationReview)
    data = {'review_id': AssetCustomizationReview.objects.last().id + 1}
    mock_update_draft_state = mocker.patch(
        'cms.controllers.modify_db.update_draft_state')

    def get_request():
        mock_request = arf.post('', data=data)
        mock_request.user = user
        mock_request.session = {}
        return mock_request

    # Test non existing review
    res = accept_review(get_request())
    assert res.status_code == status.HTTP_404_NOT_FOUND
    assert res.data['errorText'] == REVIEW_NOT_EXIST

    # Test non integration or article
    data['review_id'] = mock_review.id
    res = accept_review(get_request())
    assert res.status_code == status.HTTP_403_FORBIDDEN
    assert res.data['errorText'] == CAN_ONLY_ACCEPT_INTEGRATIONS_AND_ARTICLES

    # Test save integration
    mock_review.version.asset.asset_type = AssetType.objects.filter(
        type=AssetType.ASSET_TYPES.integration).first()
    mock_review.version.asset.save()
    res = accept_review(get_request())
    assert res.status_code == status.HTTP_200_OK
    assert res.data == 'Accepted'
    mock_update_draft_state.assert_called_once_with(
        str(mock_review.id), AssetCustomizationReview.REVIEW_STATES.accepted, user)

    # Test can't accept review
    mock_review.state = AssetCustomizationReview.REVIEW_STATES.accepted
    mock_review.save()
    res = accept_review(get_request())
    assert res.status_code == status.HTTP_403_FORBIDDEN
    assert res.data['errorText'] == CANT_ACCEPT


def test_defer_handler(mocker):
    mock_func = mocker.MagicMock()
    expected_result, kwarg_key, kwarg_value, *args = [
        str(uuid4()) for _ in range(randint(5, 15))]
    mock_func.return_value = expected_result
    kwargs = {kwarg_key: kwarg_value}

    @defer_handler
    def test_defer_decorator(*args, **kwargs):
        return mock_func(*args, **kwargs)

    deferred = test_defer_decorator(*args, **kwargs)
    assert deferred.__name__ == test_defer_decorator.__name__
    mock_func.assert_not_called()
    assert deferred() == expected_result
    mock_func.assert_called_once_with(*args, **kwargs)


def test_handle_force_update(mocker, account_factory, arf, db):
    mocker.patch.object(filldata, 'init_skin')
    asset_review = baker.make(AssetCustomizationReview)
    superuser = account_factory()
    non_superuser = account_factory(is_superuser=False)
    request = arf.post('')
    request.user = superuser

    # Test not handled
    deferred = handle_force_update(request, asset_review)
    assert deferred() is None

    # Test success
    request.POST = {'force_update'}
    deferred = handle_force_update(request, asset_review)
    assert deferred() == (
        'success', f'Version {asset_review.version.id} was force updated')

    # Test error
    request.user = non_superuser
    assert deferred() == ('error', 'You cannot force update this asset')


def test_handle_publish_single_customization(mocker, arf, account_factory, db):
    published_result = str(uuid4())
    asset_review = baker.make(AssetCustomizationReview)
    mocker.patch('cms.views.asset.publish_review',
                 return_value=published_result)
    superuser = account_factory()
    request = arf.post('')
    request.user = superuser

    # Test not publish
    deferred = handle_publish_single_customization(
        request, asset_review, True, True)
    assert not deferred()

    # Test publish handled
    request.POST = {'publish'}
    deferred = handle_publish_single_customization(
        request, asset_review, True, True)
    assert deferred() == published_result


def test_handle_publish_all_customizations(arf, account_factory, db, default_portal):
    user = account_factory()
    customizations_with_portal = Customization.objects.filter(asset__asset_type__type=AssetType.ASSET_TYPES.cloud_portal)
    asset_reviews = []
    for customization in customizations_with_portal:
        asset_reviews.append(
            baker.make(AssetCustomizationReview, customization=customization, version__created_by=user)
        )
    request = arf.post('')
    request.user = user

    # Test not handled
    deferred = handle_publish_all_customizations(
        request, asset_reviews[0], True, True)
    assert not deferred()
    review_state = AssetCustomizationReview.objects.get(
        id=asset_reviews[0].id).state
    assert review_state == AssetCustomizationReview.REVIEW_STATES.pending

    # Test handled
    request.POST = {'publish_all'}
    deferred = handle_publish_all_customizations(
        request, asset_reviews[0], True, True)
    accepted_customization_portals = list(Asset.objects.filter(
        asset_type__type=AssetType.ASSET_TYPES.cloud_portal
    ).values_list('name', flat=True))
    assert deferred() == (
        'success',
        f"Version {asset_reviews[0].version.id} has been accepted for {', '.join(accepted_customization_portals)}"
    )
    review_state = AssetCustomizationReview.objects.get(
        id=asset_reviews[0].id).state
    assert review_state == AssetCustomizationReview.REVIEW_STATES.accepted

@pytest.mark.slow
def test_handle_revoke(arf, account_factory, db):
    user = account_factory()
    asset_review = baker.make(AssetCustomizationReview,
                              version__created_by=user)
    request = arf.post('')
    request.user = user

    # Test not handled
    deferred = handle_revoke(request, asset_review, True)
    assert not deferred()
    updated_asset_review = AssetCustomizationReview.objects.get(
        id=asset_review.id)
    assert updated_asset_review.state != AssetCustomizationReview.REVIEW_STATES.rejected

    # Test handled
    request.POST = {'revoke': True, 'review_id': asset_review.id}
    deferred = handle_revoke(request, asset_review, True)
    assert deferred() == (
        'success', f"Version {asset_review.version.id} has been revoked")
    updated_asset_review = AssetCustomizationReview.objects.get(
        id=asset_review.id)
    assert updated_asset_review.state == AssetCustomizationReview.REVIEW_STATES.rejected


def test_handle_reject_or_ask(arf, account_factory, db):
    note = str(uuid4())
    user = account_factory()
    asset_review = baker.make(AssetCustomizationReview,
                              version__created_by=user)
    request = arf.post('')
    request.user = user

    # Test not handled
    deferred = handle_reject_or_ask(request, asset_review)
    assert not deferred()

    # Test reject with note
    request.POST = {'review_id': asset_review.id,
                    'addedNote': note, 'reject': True}
    deferred = handle_reject_or_ask(request, asset_review)
    assert deferred() == (
        'success', f"Version {asset_review.version.id} has been rejected")
    updated_asset_review = AssetCustomizationReview.objects.get(
        id=asset_review.id)
    assert updated_asset_review.notes == f'\n{user.email}: {note}\n'


def test_handle_invalid_permissions(mocker):
    invalid_actions = ['force_update', 'publish', 'revoke']

    for action in invalid_actions:
        mock_request = mocker.MagicMock(POST={action})
        deferred = handle_invalid_permissions(mock_request)
        pytest.raises(PermissionDenied, deferred)


def test_handle_invalid_option():
    deferred_handler = handle_invalid_option()
    assert deferred_handler() == ('error', 'Invalid option selected')


def test_get_review_arguments(arf, account_factory, db):
    asset_review = baker.make(AssetCustomizationReview)
    superuser = account_factory()
    non_superuser = account_factory(is_superuser=False)
    request = arf.post('', data={'review_id': asset_review.id})
    request.user = superuser

    # Test has permission
    retrieved_review, can_publish, has_asset_type_permission = get_review_arguments(
        request)
    assert asset_review == retrieved_review
    assert can_publish
    assert has_asset_type_permission

    # Test doesn't have permission
    request.user = non_superuser
    retrieved_review, can_publish, has_asset_type_permission = get_review_arguments(
        request)
    assert asset_review == retrieved_review
    assert not can_publish
    assert not has_asset_type_permission


def test_handle_display_message(mocker):
    request = str(uuid4())
    msg_levels = ['debug', 'info', 'success', 'warning', 'error']
    test_messages = {
        level: str(uuid4())
        for level in msg_levels
    }

    for level, message in test_messages.items():
        mock_level = mocker.patch.object(messages, level)
        message_tuple = level, message
        handle_display_message(
            request, message_tuple)
        mock_level.assert_called_once_with(
            request, message)


def test_review(mocker, arf, account_factory, db):
    can_publish = True
    has_asset_type_permission = True
    mock_review = None
    mock_request = arf.post('')
    mock_request.user = account_factory()
    mocker.patch.object(mock_request.user, 'is_superuser', True)
    mock_request.session = {}
    mock_get_review_arguments = mocker.patch('cms.views.asset.get_review_arguments', return_value=[
                                             mock_review, can_publish, has_asset_type_permission])
    mock_handle_display_message = mocker.patch(
        'cms.views.asset.handle_display_message')
    mocker.patch('cms.controllers.modify_db.update_draft_state')
    mocker.patch(
        'cms.controllers.modify_db.publish_latest_version', return_value=[])
    mocker.patch(
        'cms.models.UserGroupsToAssetPermissions.check_customization_access', return_value=True)
    mocker.patch('cms.views.asset.review_generator', return_value=[])
    mock_init_skin = mocker.patch('cms.views.asset.filldata.init_skin')

    # Test version doesn't exist
    res = review(mock_request)
    assert res.content == 'Version does not exist'.encode()
    assert res.status_code == status.HTTP_400_BAD_REQUEST

    # Test invalid option
    mock_review = baker.make(AssetCustomizationReview)
    base_data = {'review_id': mock_review.id}
    mock_get_review_arguments.return_value = [
        mock_review, can_publish, has_asset_type_permission]
    mock_request.POST = base_data
    review(mock_request)
    mock_handle_display_message.assert_called_with(
        mock_request, ('error', 'Invalid option selected'))

    # Test handle invalid permission
    mock_handle_invalid_permissions = mocker.patch(
        'cms.views.asset.handle_invalid_permissions', side_effect=PermissionDenied)
    pytest.raises(PermissionDenied, review, mock_request)
    mock_handle_invalid_permissions.side_effect = None

    # Test handle reject or ask
    mock_request.POST = {**base_data, 'reject': True, 'addedNote': True}
    review(mock_request)
    mock_handle_display_message.assert_called_with(
        mock_request, ('success', f"Version {mock_review.version.id} has been rejected"))

    # Test handle revoke
    mock_request.POST = {**base_data, 'revoke': True}
    review(mock_request)
    mock_handle_display_message.assert_called_with(
        mock_request, ('success', f"Version {mock_review.version.id} has been revoked"))

    # Test handle publish all customizations
    mock_request.POST = {**base_data, 'publish_all': True}
    review(mock_request)
    mock_handle_display_message.assert_called_with(
        mock_request, ('success', f"Version {mock_review.version.id} has been accepted for {', '.join([])}"))

    # Test handle publish single customization
    mock_request.POST = {**base_data, 'publish': True}
    review(mock_request)
    mock_handle_display_message.assert_called_with(
        mock_request, ('success', f'Version {mock_review.version.id} has been published'))

    # Test handle force update
    mock_request.POST = {**base_data, 'force_update': True}
    review(mock_request)
    mock_init_skin.assert_any_call(mock_review.version.asset, preview=False)
    mock_init_skin.assert_any_call(mock_review.version.asset, preview=True)
    mock_handle_display_message.assert_called_with(
        mock_request, ('success', f'Version {mock_review.version.id} was force updated'))


def test_make_preview(mocker, arf, account_factory, default_customization, db):
    asset_redirect_url = str(uuid4())
    user = account_factory()
    mock_content_version = baker.make(ContentVersion)
    mock_context = baker.make(Context)
    data = {'version_id': mock_content_version.id,
            'context_id': mock_context.id}
    mock_asset = mock_content_version.asset
    mock_check_asset_edit_content = mocker.patch(
        'cms.models.UserGroupsToAssetPermissions.check_asset_edit_content',
        return_value=False
    )
    mock_check_customization_publish = mocker.patch(
        'cms.models.UserGroupsToAssetPermissions.check_customization_publish',
        return_value=False
    )
    mock_generate_preview = mocker.patch(
        'cms.controllers.modify_db.generate_preview', return_value=asset_redirect_url)
    mock_error = mocker.patch('django.contrib.messages.error')

    def get_request():
        mock_request = arf.post('', data=data)
        mock_request.user = user
        mock_request.data = data
        mock_request.session = {}
        return mock_request

    # Test doesn't have permissions
    pytest.raises(PermissionDenied, make_preview, get_request())

    # Test can preview on portal
    mock_check_asset_edit_content.return_value = mock_check_customization_publish.return_value = True
    res = make_preview(get_request())
    assert res.status_code == status.HTTP_200_OK
    assert res.content == asset_redirect_url.encode()
    mock_generate_preview.assert_called_once_with(
        mock_asset, mock_context, version_id=str(mock_content_version.id), send_to_review=True)
    mock_error.assert_not_called()

    # Test can't preview on portal
    mock_asset = baker.make(
        Asset, asset_type=AssetType.objects.filter(can_preview=False).first())
    mock_asset.customizations.add(default_customization)

    mock_content_version.asset = mock_asset
    mock_content_version.save()
    mock_review = baker.make(
        AssetCustomizationReview, version=mock_content_version, customization=default_customization)
    asset_redirect_url = str(uuid4())
    mocker.patch.object(urls, 'reverse', return_value=asset_redirect_url)
    res = make_preview(get_request())
    assert res.content == asset_redirect_url.encode()


def test_handle_settings_from_json(mocker, arf, account_factory, db):
    user = account_factory()
    request = arf.post('')
    request.user = user
    non_json, form, asset = [
        mocker.MagicMock()
        for _ in range(3)]

    file_name, task_id, json_cache_id, asset_type, *settings_file = [
        str(uuid4())
        for _ in range(randint(10, 15))]
    non_json.name = file_name
    asset.asset_type = asset_type
    form.cleaned_data = {'force': True}

    # Test not handled
    assert not handle_settings_from_json(request, True, form, non_json, asset)

    # Test handles update_asset_by_json
    form.cleaned_data['action'] = 'update_asset_by_json'
    mock_update_asset = mocker.patch.object(structure, 'update_asset_by_json')
    mock_success_message = mocker.patch.object(messages, 'success')

    assert handle_settings_from_json(
        request, True, form, settings_file, asset) == [None, None, []]
    mock_update_asset.assert_called_once_with(asset, settings_file[0], user)
    mock_success_message.assert_called_once_with(request, 'Content updated')

    # Test handles import_assets_from_json
    form.cleaned_data['action'] = 'import_assets_from_json_publish'
    mocker.patch.object(uuid, 'uuid4', return_value=json_cache_id)
    mock_info_message = mocker.patch.object(messages, 'info')
    mock_async_import = mocker.patch.object(
        tasks.async_import_assets_from_json, 'apply_async', return_value=task_id)
    assert handle_settings_from_json(
        request, True, form, settings_file, asset) == [task_id, None, []]
    mock_info_message.assert_called_once_with(
        request, 'Starting assets import')
    mock_async_import.assert_called_once_with(
        args=[json_cache_id, user.id, True], queue='broadcast-notifications')
    assert PackagesCache()[json_cache_id] == settings_file

    # Test handles update_structure
    form.cleaned_data['action'] = 'update_structure'
    mock_warning_message = mocker.patch.object(messages, 'warning')
    mock_update_from_object = mocker.patch.object(
        structure, 'update_from_object')

    assert handle_settings_from_json(
        request, True, form, settings_file, asset) == [None, None, []]
    mock_warning_message.assert_called_once_with(request, "You can only update one asset_type at a time. "
                                                 "Only the first asset type from structure.json was used.")
    mock_update_from_object.assert_called_once_with(
        settings_file, asset_type=asset_type, preserve_files=True)
    mock_success_message.assert_called_with(
        request, 'Structure updated')

    # Test handles invalid
    form.cleaned_data['action'] = 'invalid action'
    error_response = handle_settings_from_json(
        request, True, form, settings_file, asset)[1]
    assert isinstance(error_response, HttpResponseBadRequest)
    assert error_response.content == 'json is acceptable only for Updating structure'.encode()


def test_handle_settings_from_zip(mocker, arf, account_factory, db):
    def assert_has_correct_attachment(res, expected_content):
        assert res.status_code == status.HTTP_200_OK
        assert res.content == expected_content.encode()
        assert res.cookies['filename'].value == 'structure.json'

    user = account_factory()
    request = arf.post('')
    request.user = user
    file, form, asset = [
        mocker.MagicMock()
        for _ in range(3)]
    form.cleaned_data = {}
    file.name = str(uuid4())

    # Test not a zip file
    res = handle_settings_from_zip(request, form, file, asset)
    assert isinstance(res, HttpResponseBadRequest)
    assert res.content == 'zip archive is expected'.encode()

    # Test handle generate_json
    form.cleaned_data['action'] = 'generate_json'
    file.name += '.zip'
    error_file, error_extension, *data = [
        str(uuid4()) for _ in range(randint(5, 15))]
    mock_generate_structure = mocker.patch.object(
        generate_structure, 'from_zip', return_value=(
            data, [{'file': error_file, 'extension': error_extension}]))
    mock_error_message = mocker.patch.object(messages, 'error')
    expected_content = json.dumps(
        data, ensure_ascii=False, indent=4, separators=(',', ': '))

    res = handle_settings_from_zip(request, form, file, asset)
    mock_generate_structure.assert_called_once_with(file, asset)
    mock_error_message.assert_called_once_with(
        request, f'Error with {error_file} problem with {error_extension}')
    assert_has_correct_attachment(res, expected_content)

    # Test handle merge_with_db
    form.cleaned_data['action'] = 'merge_with_db'
    mock_merge_with_db = mocker.patch.object(
        generate_structure, 'merge_db_with_archive', return_value=data)

    res = handle_settings_from_zip(request, form, file, asset)
    mock_merge_with_db.assert_called_once_with(file, asset)
    assert_has_correct_attachment(res, expected_content)

    # Test handle update_structure
    form.cleaned_data['action'] = 'update_structure'
    message = str(uuid4())
    message_tuple = ('warning', message)
    mock_process_zip = mocker.patch.object(
        structure, 'process_zip', return_value=[message_tuple])
    mock_add_message = mocker.patch.object(messages, 'add_message')

    assert not handle_settings_from_zip(request, form, file, asset)
    mock_process_zip.assert_called_once_with(
        file, user, asset, True, False)
    mock_add_message.assert_called_once_with(
        request, messages.WARNING, message)

    # Test handle update_content
    form.cleaned_data['action'] = 'update_content'
    assert not handle_settings_from_zip(request, form, file, asset)
    mock_process_zip.assert_called_with(
        file, user, asset, False, True)
    mock_add_message.assert_called_with(
        request, messages.WARNING, message)


def test_handle_settings_file(mocker):
    request, form, file, asset, json_handler_result, zip_handler_response = [
        str(uuid4()) for _ in range(6)]
    mock_handle_settings_from_json = mocker.patch(
        'cms.views.asset.handle_settings_from_json', return_value=json_handler_result)
    mock_handle_settings_from_zip = mocker.patch(
        'cms.views.asset.handle_settings_from_zip', return_value=zip_handler_response)

    # Test handle json
    assert handle_settings_file(
        request, form, file, asset) == json_handler_result
    mock_handle_settings_from_json.assert_called_once_with(
        request, False, form, file, asset)
    mock_handle_settings_from_zip.assert_not_called()

    # Test handle zip
    mock_handle_settings_from_json.return_value = None
    assert handle_settings_file(request, form, file, asset) == (
        None, zip_handler_response, [])


def test_get_settings_from_request(arf, account_factory, db):
    asset_type = AssetType.objects.first() or baker.make(AssetType)
    asset = baker.make(Asset, asset_type=asset_type)
    user = account_factory()
    data = {}
    request = arf.post('', data=data)
    request.user = user
    request.data = data
    request.session = {}
    context = {
        'instance': asset_type,
        'instance_type': AssetType.__name__,
        'asset': asset,
        'asset_type': asset_type,
        'form': None,
        'conflicts': [],
        'file': '',
        'user': request.user,
        'has_permission': admin.site.has_permission(request),
        'site_url': admin.site.site_url,
        'site_header': admin.site.site_header,
        'site_title': admin.site.site_title,
        'task_id': '',
        'title': f'Settings for {asset_type}',
        'type_settings': True
    }

    assert get_settings_from_request(request, asset_type.id, target_class=AssetType) == (
        asset, None, context, None)


def test_asset_settings(mocker, arf, account_factory, db):
    def get_request(data={}, file={}):
        name = file.get('name')
        content = file.get('content')
        uploaded_file = {
            'file': SimpleUploadedFile(name, content)
        } if name and content else {}
        mock_request = arf.post('', data={**data, **uploaded_file})
        mock_request.user = account_factory()
        mock_request.data = data
        mock_request.session = {}
        return mock_request

    mock_asset = baker.make(Asset)
    mock_rendered = api_success(str(uuid4()))
    mock_render = mocker.patch.object(
        shortcuts, 'render', return_value=mock_rendered)

    # Test without file
    mock_request = get_request()
    asset_settings(mock_request, mock_asset.id).data == mock_rendered
    context_from_call = mock_render.mock_calls[-1].args[-1]
    expected_context = {
        **get_settings_from_request(mock_request, mock_asset.id)[2],
        'form': context_from_call['form']
    }
    assert context_from_call == expected_context

    # Test with file
    task_id, error_response, file, *asset_name_conflicts = [
        str(uuid4()) for _ in range(10)]
    mock_handle_settings_file = mocker.patch(
        'cms.views.asset.handle_settings_file', return_value=[task_id, None, asset_name_conflicts])
    mock_request = get_request({
        'action': 'generate_json'
    },
        {
        'name': str(uuid4()),
        'content': file.encode()
    })
    asset_settings(mock_request, mock_asset.id).data == mock_rendered
    context_from_call = mock_render.mock_calls[-1].args[-1]
    expected_context = {
        **get_settings_from_request(mock_request, mock_asset.id)[2],
        'form': context_from_call['form'],
        'task_id': task_id,
        'conflicts': asset_name_conflicts
    }

    # Test with error_uploading
    mock_handle_settings_file.return_value = [
        None, api_success(error_response), None]
    asset_settings(mock_request, mock_asset.id).data == error_response


def test_download_current_structure(mocker, arf, account_factory, db):
    mock_request = arf.get('')
    mock_request.session = {}
    mock_request.user = account_factory()
    mock_asset = baker.make(Asset)
    mock_task_id = str(uuid4())
    mocker.patch(
        'cms.tasks.make_structure.apply_async', return_value=mock_task_id)
    cache_key = tasks.get_package_cache_key(
        mock_asset, structure_format='json')

    # Test no structure info
    res = download_current_structure(mock_request, mock_asset.id)
    assert res.data == {"msg": f"Building the {mock_asset} structure",
                        "is_ready": False, "task_id": mock_task_id}
    assert PACKAGES_CACHE[cache_key] == {
        "file": None, "is_ready": False, "task_id": mock_task_id}

    # Test not ready
    res = download_current_structure(mock_request, mock_asset.id)
    assert res.data == {"msg": f"{mock_asset} structure is not ready",
                        "is_ready": False, "task_id": mock_task_id}

    # Test ready
    PACKAGES_CACHE[mock_task_id] = True
    res = download_current_structure(mock_request, mock_asset.id)
    assert res.data == {"msg": f"{mock_asset} structure is ready",
                        "is_ready": True, "task_id": mock_task_id}


def test_sub_doc_urls(db):
    base_path = '%CLOUD_LINK%/docs/'
    developers = 'developers'
    developers_path = f'{base_path}{developers}/'
    kb_path = str(uuid4())

    # Test base kb link
    base_kb_url = f'{developers_path}{kb_path}'
    base_kb_href = f'href="{base_kb_url}"'
    base_kb_matchobj = INTERNAL_DOC_REGEX.search(base_kb_href)
    assert sub_doc_urls(base_kb_matchobj) == base_kb_href

    # Test doc kb link
    mock_asset = baker.make(
        Asset, asset_type=AssetType.objects.filter(type=AssetType.ASSET_TYPES.documentation).first())
    param_name = str(uuid4())
    asset_href = f'href="{base_kb_url}/{mock_asset.id}-{param_name}"'
    asset_matchobj = INTERNAL_DOC_REGEX.search(asset_href)
    res = sub_doc_urls(asset_matchobj)
    url_data = {
        'type': 'kb_article',
        'base': developers,
        'kb': kb_path,
        'asset_uuid': str(mock_asset.uuid),
        'asset_name': mock_asset.name,
        'param_name': param_name
    }
    assert res == f'href="{base_path}{{% {json.dumps(url_data)} %}}"'


def test_prepare_doc_urls(mocker):
    url = f'href="%CLOUD_LINK%/docs/{uuid4()}"'
    updated_url = str(uuid4())
    body_ds = {'name': 'body', 'value': url}
    content = {'name': 'content', 'values': [body_ds]}
    asset_dict = {'contexts': [content]}
    mocker.patch('cms.views.asset.sub_doc_urls', return_value=updated_url)

    prepare_doc_urls(asset_dict)
    assert body_ds['value'] == updated_url


def test_prepare_asset_exports(mocker):
    asset = mocker.MagicMock()
    mock_prepare_doc_urls = mocker.patch('cms.views.asset.prepare_doc_urls')
    asset_dict = str(uuid4())

    # Test handle non-documentation
    prepare_asset_exports(asset, asset_dict)
    mock_prepare_doc_urls.assert_not_called()

    # Test handle documentation
    asset.asset_type.type = AssetType.ASSET_TYPES.documentation
    prepare_asset_exports(asset, asset_dict)
    mock_prepare_doc_urls.assert_called_once_with(asset_dict)


def test_download_all_asset_structures(arf, mocker, account_factory, db):
    mock_request = arf.get('')
    mock_request.session = {}
    mock_request.user = account_factory()
    task_id = str(uuid4())
    mock_asset = baker.make(Asset)
    asset_type = mock_asset.asset_type.type
    cache_key = f'all-asset-structures-{asset_type}-{mock_asset.id}-{mock_asset.version_id()}'
    mock_make_structure = mocker.patch(
        'cms.tasks.make_structure.apply_async', return_value=task_id)

    # Test not ready
    res = download_all_asset_structures(mock_request, asset_type)
    assert res.status_code == status.HTTP_200_OK
    assert res.data == {"msg": f"Building the All {mock_asset.asset_type} structures",
                        "is_ready": False, "task_id": task_id}
    assert PACKAGES_CACHE[cache_key] == {
        "file": None, "is_ready": False, "task_id": task_id}
    mock_make_structure.assert_called_once_with(
        kwargs={'asset_type': asset_type, 'user_id': mock_request.user.id}, queue='broadcast-notifications')

    # Test not ready
    res = download_all_asset_structures(mock_request, asset_type)
    assert res.data == {"msg": f"All {mock_asset.asset_type} structures is not ready",
                        "is_ready": False, "task_id": task_id}

    # Test ready
    PACKAGES_CACHE[task_id] = True
    res = download_all_asset_structures(mock_request, asset_type)
    assert res.data == {
        "msg": f"All {mock_asset.asset_type} structures is ready", "is_ready": True, "task_id": task_id}


def test_download_file(mocker, arf, account_factory, db):
    version_id, path, file = [str(uuid4()) for _ in range(3)]
    show_image = draft = True
    language = baker.make(Language)
    asset = baker.make(Asset)
    mock_request = arf.get(
        '',
        data={
            'show_image': show_image,
            'draft': draft,
            'lang': language.code,
            'version_id': version_id,
            'asset_id': asset.id
        }
    )
    mock_request.user = account_factory()

    # Test file exist
    mock_read_customized_file = mocker.patch(
        'cms.controllers.filldata.read_customized_file', return_value=file)
    res = download_file(mock_request, path)
    assert res.content == file.encode()
    assert res.headers['content-type'] == 'image/png'
    mock_read_customized_file.assert_called_once_with(
        path, asset, language.code, version_id, draft)

    # Test doesn't exist
    mock_read_customized_file = mocker.patch(
        'cms.controllers.filldata.read_customized_file', return_value=None)
    file = None
    res = download_file(mock_request, path)
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert res.content == 'File does not exist'.encode()


def test_download_package(mocker, arf, account_factory, db):
    user = account_factory()
    mock_asset = baker.make(Asset)
    mock_has_perm = mocker.patch.object(user, 'has_perm', return_value=False)

    def get_request(data={}):
        mock_request = arf.get('', data=data)
        mock_request.session = {}
        mock_request.user = user
        return mock_request

    # Test user doesn't have permission
    res = download_package(get_request(), mock_asset.id)
    assert res.status_code == status.HTTP_403_FORBIDDEN

    # Test no versions
    mock_has_perm.return_value = True
    res = download_package(get_request(), mock_asset.id)
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert res.content == "There are no published versions for this asset.".encode()

    # Test latest version doesn't have required data
    mocker.patch('django.urls.reverse', return_value=str(uuid4()))
    previous_review = baker.make(
        AssetCustomizationReview, version__asset=mock_asset, state=AssetCustomizationReview.REVIEW_STATES.accepted)
    latest_review = baker.make(
        AssetCustomizationReview, version__asset=mock_asset, state=AssetCustomizationReview.REVIEW_STATES.accepted)
    res = download_package(get_request(), mock_asset.id)
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert res.content == f"Asset does not have all required fields filled for version: {latest_review.version.id}".encode(
    )

    # Test specific version doesn't have required data
    res = download_package(
        get_request(
            {'version_id': str(previous_review.version.id)}
        ),
        mock_asset.id
    )
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert res.content == f"Asset does not have all required fields filled for version: {previous_review.version.id}".encode(
    )

    # Test handle cloud portal and vms packages
    expected_package_info = str(uuid4())
    mock_asset_has_required_data = mocker.patch(
        'cms.controllers.modify_db.asset_has_required_data', return_value=[])
    mock_handle_cloud_portal_and_vms_package = mocker.patch(
        'cms.views.asset.handle_cloud_portal_and_vms_package', return_value=expected_package_info)
    res = download_package(get_request(), mock_asset.id)
    assert res.status_code == status.HTTP_200_OK
    assert res.data == expected_package_info
    mock_asset_has_required_data.assert_called_once_with(
        mock_asset, latest_review.version.id)
    mock_handle_cloud_portal_and_vms_package.assert_called_once_with(
        mock_asset, False, None)

    # Test handle other packages
    mock_handle_cloud_portal_and_vms_package.return_value = False
    mock_asset.asset_type = AssetType.objects.filter(
        type=AssetType.ASSET_TYPES.integration).first()
    mock_asset.save()
    res = download_package(get_request(), mock_asset.id)
    assert res.status_code == status.HTTP_200_OK
    assert res.content == filldata.PackageExporter(
        mock_asset, False, None).get_zip_package()
    assert res.cookies['filename'].value == make_package_name(mock_asset)


def test_download_async_package(arf, account_factory, db):
    version_id = str(uuid4())
    expected_file = str(uuid4())
    draft = True
    mock_request = arf.get('', data={'version_id': version_id, 'draft': draft})
    mock_request.user = account_factory()
    mock_asset = baker.make(Asset)
    mock_customization = baker.make(Customization)
    mock_asset.customizations.add(mock_customization)
    cache_key = tasks.get_package_cache_key(mock_asset, draft, version_id)

    # Test no package
    assert download_async_package(mock_request, mock_asset.id).data == {
        "msg": "No package is being made"}

    # Test not ready
    PACKAGES_CACHE[cache_key] = {'is_ready': False}
    assert download_async_package(mock_request, mock_asset.id).data == {
        "msg": "Package is not ready"}

    # Test ready
    PACKAGES_CACHE[cache_key] = {'is_ready': True, 'file': expected_file}
    res = download_async_package(mock_request, mock_asset.id)
    assert res.content == expected_file.encode()
    assert res.headers['content-type'] == 'application/zip'


def test_upload_image(mocker, arf, account_factory, db):
    mock_file_content, mock_content_file_instance, mock_location, content_uuid, mock_format = [
        str(uuid4()) for _ in range(5)]
    mock_file, mock_pil_image, mock_ext_file = [
        mocker.MagicMock() for _ in range(3)]

    mock_file.read.return_value = mock_file_content
    mock_pil_image.format = mock_format

    mock_request = arf.post('', data={'file': mock_file})
    mock_request.user = account_factory()
    mock_request.session = {}
    mock_ext_file.file.url = mock_location

    mock_external_file_create = mocker.patch(
        'cms.models.ExternalFile.objects.create', return_value=mock_ext_file)

    mock_asset = baker.make(Asset)
    mock_ds = baker.make(DataStructure)

    assert upload_image(mock_request, mock_asset.id, mock_ds.id,
                        content_uuid=content_uuid).data['location'] == mock_location
    mock_external_file_create.assert_called_once_with(
        asset=mock_asset, data_structure=mock_ds, file=mock_external_file_create.mock_calls[0].kwargs['file'])


def test_get_asset_ids_by_asset_type(arf, account_factory, db):
    mock_request = arf.get('')
    mock_request.session = {}
    mock_request.user = account_factory()
    customization = Customization.objects.first()
    asset_type = choice(AssetType.objects.exclude(
        type=AssetType.ASSET_TYPES.cloud_portal))
    mock_asset = baker.make(Asset, asset_type=asset_type,
                            customizations=[customization])
    mock_request.GET = {'name': asset_type.name,
                        'type': AssetType.ASSET_TYPES[asset_type.type], 'customization': customization.name}

    res = get_asset_ids_by_asset_type(mock_request)
    assert res.data == [mock_asset.id]


class TestMenuAssetAutocomplete:
    def test_get_queryset(self, mocker, arf, account_factory, db):
        Asset.objects.filter(
            asset_type__type__in=[
                AssetType.ASSET_TYPES.documentation, AssetType.ASSET_TYPES.integration]
        ).delete()
        mock_asset = baker.make(Asset, asset_type=AssetType.objects.filter(
            type=AssetType.ASSET_TYPES.integration).first())
        mock_request = arf.get('')
        mock_request.user = account_factory()
        instance = MenuAssetAutocomplete(request=mock_request, q=None)

        # Test not staff
        qs = instance.get_queryset()
        assert not qs

        # Test is staff
        mocker.patch.object(mock_request.user, 'is_staff', True)
        qs = instance.get_queryset()
        assert list(qs) == [mock_asset]

    def test_create_object(self, mocker, arf, account_factory, db):
        Asset.objects.filter(
            asset_type__type=AssetType.ASSET_TYPES.documentation).delete()
        mock_request = arf.get('')
        mock_request.user = account_factory()
        instance = MenuAssetAutocomplete(
            request=mock_request, create_field='name')
        asset_name = str(uuid4())

        # Test object created
        asset = instance.create_object(asset_name)
        assert list(Asset.objects.filter(
            asset_type__type=AssetType.ASSET_TYPES.documentation)) == [asset]
        assert list(asset.customizations.all()) == list(
            Customization.objects.all())


def test_prepare_asset_info(mocker, arf, account_factory, db):
    mock_request = arf.get('')
    mock_request.GET = {'customization': settings.CUSTOMIZATION}
    mock_request.user = account_factory()
    customization = Customization.objects.first()
    mock_asset = baker.make(Asset, customizations=[customization])
    mock_review_url = str(uuid4())
    mocker.patch.object(helpers, 'get_admin_url', return_value=mock_review_url)
    mock_review = baker.make(
        AssetCustomizationReview, customization=customization, version__asset=mock_asset)

    # Test with customization
    asset_info = prepare_asset_info(
        mock_request, customization.name, mock_asset)
    assert asset_info == {
        'state': 'Pending',
        'customizations': {
            customization.id: customization.name
        },
        'review_url': mock_review_url
    }

    # Test without customization
    asset_info = prepare_asset_info(mock_request, 'all', mock_asset)
    assert asset_info == {
        'state': None,
        'customizations': {
            customization.id: customization.name
        },
        'review_url': None
    }


def test_get_asset_info(mocker, arf, account_factory, db):
    mock_request = arf.get('')
    mock_request.GET = {'customization': settings.CUSTOMIZATION}
    mock_request.user = account_factory()
    asset_id = str(uuid4())
    mock_asset_info = str(uuid4())
    mocker.patch(
        'cms.views.asset.prepare_asset_info_for_menu', return_value=mock_asset_info)

    assert get_asset_info_by_menu(
        mock_request, asset_id).data == mock_asset_info


def test_prepare_asset_info_for_menu(mocker, db):
    mock_asset = baker.make(Asset)
    mock_request = mocker.MagicMock()
    mock_menu = baker.make(Menu)
    mock_asset_prepared = str(uuid4())
    mocker.patch('cms.models.Menu.all_asset_ids', [mock_asset.id])
    mock_prepare_asset_info = mocker.patch(
        'cms.views.asset.prepare_asset_info', return_value=mock_asset_prepared)
    mock_request.GET = {'customization': settings.CUSTOMIZATION}

    assert prepare_asset_info_for_menu(mock_request, mock_menu.id) == {
        mock_asset.id: mock_asset_prepared}


def test_get_asset_info_by_menu(mocker, arf, account_factory, db):
    mock_request = arf.get('')
    mock_request.GET = {'customization': settings.CUSTOMIZATION}
    mock_request.user = account_factory()
    menu_id = str(uuid4())
    mock_asset_info = str(uuid4())
    mocker.patch(
        'cms.views.asset.prepare_asset_info_for_menu', return_value=mock_asset_info)

    assert get_asset_info_by_menu(
        mock_request, menu_id).data == mock_asset_info


class TestCustomClientViewSet:
    @staticmethod
    def check_and_replace_class_variables(view_class):
        expected_variables = {
            'permission_classes': [IsAuthenticated],
            'serializer_class': CustomClientSerializer,
            'waffle_flag': FLAGS.custom_clients
        }
        actual_values = {}
        for attribute, value in expected_variables.items():
            actual_value = getattr(view_class, attribute, str(uuid4()))
            assert actual_value == value
            actual_values[attribute] = actual_value
            setattr(view_class, attribute, None)
        return actual_values

    @staticmethod
    def restore_class_variables(view_class, values):
        for attribute, value in values.items():
            setattr(view_class, attribute, value)

    @pytest.fixture
    def get_instance(self, mocker, arf, account_factory, db):
        def _get_instance(*args, **kwargs):
            custom_client = kwargs.pop('custom_client', False)
            if not kwargs.get('request'):
                kwargs['request'] = arf.get('')
                kwargs['request'].user = account_factory()

            instance = CustomClientViewSet(*args, **kwargs)
            if custom_client:
                mocker.patch.object(instance, 'get_object',
                                    return_value=custom_client)
            return instance

        original_values = self.check_and_replace_class_variables(CustomClientViewSet)
        yield _get_instance
        # Restore class attributes so the adjacent tests are not affected
        self.restore_class_variables(CustomClientViewSet, original_values)

    def test_get_queryset(self, mocker, get_instance, db):
        instance = get_instance()
        custom_client = baker.make(CustomClient, created_customization=Customization.objects.filter(
            name=settings.CUSTOMIZATION).first())

        # Test non-superuser no clients
        mocker.patch.object(instance.request.user, 'is_superuser', False)
        assert not instance.get_queryset()

        # Test non-superuser has client
        instance.request.user.customclient_set.add(custom_client)
        assert list(instance.get_queryset()) == [custom_client]

    def test_perform_create(self, mocker, get_instance, db):
        instance = get_instance()
        mock_serializer = mocker.MagicMock()
        mock_base_vms = str(uuid4())
        mock_get_vms_asset = mocker.patch(
            'cms.models.get_vms_asset', return_value=mock_base_vms)
        expected_meta_kwargs = {
            'created_by': instance.request.user,
            'created_customization': Customization.objects.filter(name=settings.CUSTOMIZATION).first(),
        }
        expected_non_meta_kwargs = {
            **expected_meta_kwargs,
            'base_vms': mock_base_vms
        }

        # Test non meta
        instance.perform_create(mock_serializer)
        mock_serializer.save.assert_called_once_with(
            **expected_non_meta_kwargs)
        mock_get_vms_asset.assert_called_once_with(settings.CUSTOMIZATION)

        # Test meta
        mocker.patch.object(settings, 'META', True)
        instance.perform_create(mock_serializer)
        mock_serializer.save.assert_called_with(**expected_meta_kwargs)

    def test_get_manifest(self, mocker, get_instance):
        mock_contexts = str(uuid4())
        mock_settings = str(uuid4())
        instance = get_instance()
        mock_generate_contexts = mocker.patch.object(
            instance, 'generate_contexts_for_manifest', return_value=mock_contexts)
        mock_generate_settings = mocker.patch.object(
            instance, 'generate_settings_for_manifest', return_value=mock_settings)

        res = instance.get_manifest(instance.request)
        assert res.status_code == status.HTTP_200_OK
        assert res.data == {
            'manifest': {
                'contexts': mock_contexts,
                'settings': mock_settings
            }
        }
        mock_generate_contexts.assert_called_once_with()
        mock_generate_settings.assert_called_once_with(instance.request)

    def test_generate_package(self, mocker, get_instance, db):
        mock_task_id, mock_cache_key, mock_download_id = [
            str(uuid4()) for _ in range(3)]
        mock_custom_client = baker.make(CustomClient)
        mock_make_custom_client = mocker.patch(
            'cms.tasks.make_custom_client.apply_async', return_value=mock_task_id)
        mock_get_custom_client_package_key = mocker.patch(
            'cms.tasks.get_custom_client_package_key', return_value=mock_cache_key)
        mocker.patch.object(uuid, 'uuid4', return_value=mock_download_id)
        instance = get_instance(custom_client=mock_custom_client)

        res = instance.generate_package(instance.request)
        assert res.status_code == status.HTTP_200_OK
        assert res.data['downloadId'] == mock_download_id
        assert PACKAGES_CACHE[mock_cache_key] == {
            "file": None, "is_ready": False, "task_id": mock_task_id}
        expected_args = [mock_custom_client.pk, mock_download_id]
        mock_make_custom_client.assert_called_once_with(args=expected_args, queue='broadcast-notifications')
        mock_get_custom_client_package_key.assert_called_once_with(
            *expected_args)

    def test_get_download_package(self, mocker, get_instance, db):
        mock_cache_key, mock_pk, mock_cached_package = [
            str(uuid4()) for _ in range(3)]
        mock_download_uuid = uuid4()
        mock_download_id = str(mock_download_uuid)
        mock_get_custom_client_package_key = mocker.patch(
            'cms.tasks.get_custom_client_package_key', return_value=mock_cache_key)
        instance = get_instance()
        instance.request.query_params = {'downloadId': mock_download_id}

        PACKAGES_CACHE[mock_cache_key] = mock_cached_package
        assert instance.get_download_package(
            instance.request, mock_pk) == mock_cached_package
        mock_get_custom_client_package_key.assert_called_once_with(
            mock_pk, mock_download_uuid)

    def test_check_package(self, mocker, get_instance, db):
        mock_task_id, mock_result, mock_serialized = [
            str(uuid4()) for _ in range(3)]
        mock_package = {'task_id': mock_task_id}
        mock_custom_client = baker.make(CustomClient)
        instance = get_instance(custom_client=mock_custom_client)
        mock_get_download_package = mocker.patch.object(
            instance, 'get_download_package', return_value=None)
        instance.user = instance.request.user

        # Test package not available
        res = instance.check_package(instance.request)
        assert res.status_code == status.HTTP_404_NOT_FOUND
        assert res.data['errorText'] == 'Package not available'
        mock_get_download_package.assert_called_once_with(
            instance.request, mock_custom_client.pk)

        # Test package available
        mock_get_download_package.return_value = mock_package
        mock_async_result = mocker.patch(
            'celery.result.AsyncResult', return_value=mock_result)
        mocker.patch.object(
            CheckPackageCustomClientSerializer, 'data', mock_serialized)
        res = instance.check_package(instance.request)
        assert res.status_code == status.HTTP_200_OK
        assert res.data == mock_serialized
        mock_async_result.assert_called_once_with(mock_task_id)
