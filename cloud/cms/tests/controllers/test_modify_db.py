from uuid import uuid4
from random import randint, choice
from io import BytesIO

import pytest
from unittest.mock import call
from model_bakery import baker

from cms.models import Asset, AssetCustomizationReview
from cms.controllers.modify_db import *


class TestModifyDB:
    def test_update_draft_state(self, asset_factory, account_factory, db):
        initial_state = AssetCustomizationReview.REVIEW_STATES.pending
        target_state = AssetCustomizationReview.REVIEW_STATES.accepted
        user = account_factory()
        asset, = asset_factory(
            state=initial_state, qty=1, account=user)
        review = AssetCustomizationReview.objects.filter(
            version__asset=asset).last()

        update_draft_state(review.id, target_state, user)
        updated_review = AssetCustomizationReview.objects.filter(
            id=review.id).last()

        assert updated_review.version.accepted_by == user
        assert updated_review.state == target_state

    def test_notify_version_ready(
            self, asset_factory, account_factory, add_permission, mock_cloud_portal_customization_cache, mocker, db):
        mock_send = mocker.patch('notifications.notifications_api.send')
        mock_cloud_portal_customization_cache(
            reviews_enabled=True, integration_store_enabled=True)
        users = [
            add_permission(
                account_factory(email=f'{uuid4()}@test.com'),
                'publish_version'
            ) for _ in range(randint(5, 15))]

        receive_all_users = [
            add_permission(
                account_factory(email=f'{uuid4()}@test.com'),
                'get_all_review_emails'
            ) for _ in range(randint(5, 15))]

        user, *other_users = users

        asset, = asset_factory(qty=1, account=user)
        asset_type = AssetType.ASSET_TYPES[asset.asset_type.type]
        review = AssetCustomizationReview.objects.filter(
            version__asset=asset).last()
        notify_version_ready(asset, review.version, user)

        assert len(mock_send.mock_calls) == len(other_users + receive_all_users)
        mock_send.assert_has_calls(
            [call(user.email,
                 'review_version',
                 {
                     'id': review.id,
                     'asset': asset.name,
                     'asset_type': asset_type
                 },
                 customization = user.customization)
            for user in other_users], any_order=True)

    def test_are_asset_datarecords_unique_is_unique(self, mocker, asset_factory, account_factory, db):
        mocker.patch(
            'cms.controllers.modify_db.is_datarecord_unique', return_value=True)
        asset, = asset_factory(qty=1, account=account_factory())

        is_unique, ds = are_asset_datarecords_unique(asset)
        assert is_unique
        assert ds is None

    def test_are_asset_datarecords_unique_not_unique(self, mocker, asset_factory, account_factory, db):
        non_unique_ds = mocker.MagicMock()
        mocker.patch('cms.models.DataStructure.objects.filter',
                     return_value=[non_unique_ds])
        mocker.patch(
            'cms.controllers.modify_db.is_datarecord_unique', return_value=False)
        asset, = asset_factory(qty=1, account=account_factory())

        is_unique, ds = are_asset_datarecords_unique(asset)
        assert not is_unique
        assert ds is non_unique_ds

    def is_datarecord_unique(self):
        assert False

    def test_update_latest_record_version(self, mocker):
        mock_record = mocker.MagicMock()
        records = mocker.MagicMock()
        records.latest.return_value = mock_record
        mock_record.version = 0
        new_version = str(uuid4())

        update_latest_record_version(records, new_version)
        mock_record.save.assert_called_once_with()
        assert mock_record.version == new_version

    def test_update_records_to_version(self, mocker):
        translated_records = str(uuid4())
        all_records = str(uuid4())

        def generate_mock_context(translatable=False):
            mock_context = mocker.MagicMock()
            mock_ds = mocker.MagicMock()
            mock_ds_list = [mock_ds]
            mock_ds.translatable = translatable
            translatable_records = mocker.MagicMock()
            translatable_records.filter.return_value = translated_records
            mock_ds.datarecord_set.filter.return_value = translatable_records if translatable else all_records
            mock_context.datastructure_set.all.return_value = mock_ds_list
            return mock_context

        mock_languages = [str(uuid4())]
        mocker.patch('cms.models.Language.objects.all',
                     return_value=mock_languages)
        mock_update_latest_record_version = mocker.patch(
            'cms.controllers.modify_db.update_latest_record_version')
        mock_contexts_translatable = [generate_mock_context(
            translatable=True) for _ in range(randint(3, 11))]
        mock_contexts_non_translatable = [
            generate_mock_context() for _ in range(randint(3, 11))]
        mock_version = str(uuid4())
        mock_asset = str(uuid4())

        # Test non translatable
        expected_non_translatable_calls = [
            call(all_records, mock_version)] * len(mock_contexts_non_translatable)
        update_records_to_version(
            mock_asset, mock_contexts_non_translatable, mock_version)
        mock_update_latest_record_version.assert_has_calls(
            expected_non_translatable_calls)

        # Test translatable
        expected_translatable_calls = [
            call(translated_records, mock_version)] * len(mock_contexts_translatable)
        update_records_to_version(
            mock_asset, mock_contexts_translatable, mock_version)
        mock_update_latest_record_version.assert_has_calls(
            expected_translatable_calls)

    def test_strip_version_from_records(self, mocker):
        mock_records = [mocker.MagicMock() for _ in range(randint(1, 100))]
        mock_datarecord = mocker.patch('cms.models.DataRecord.objects.filter')
        mock_datarecord.return_value = mock_records
        version = str(uuid4())
        asset = str(uuid4())

        strip_version_from_records(version=version, asset=asset)
        mock_datarecord.assert_called_once_with(asset=asset, version=version)

        for record in mock_records:
            record.save.assert_called_once()
            record.version is None

    def test_remove_unused_records(self, mocker):
        mock_records = [mocker.MagicMock() for _ in range(randint(1, 100))]
        mock_datarecord = mocker.patch('cms.models.DataRecord.objects.filter')
        mock_datarecord.return_value = mock_records
        asset = str(uuid4())

        remove_unused_records(asset)
        mock_datarecord.assert_called_once_with(asset=asset, version_id=None)

        for record in mock_records:
            record.delete.assert_called_once()

    def test_generate_preview_links(self, mocker):
        state = str(uuid4())
        mock_asset = mocker.MagicMock()
        mock_asset.id = str(uuid4())
        params = urlencode({"state": state, "id": mock_asset.id})

        # Test integration preview
        mock_asset.is_integration = True
        assert next(generate_preview_links(asset=mock_asset, state=state)) == (
            'Integrations Preview', f"{settings.INTEGRATION_STORE_PAGE}/{mock_asset.id}?state={state}")
        mock_asset.is_integration = False

        # Test article preview
        article_url = str(uuid4())
        mock_asset.is_article = True
        mock_data_record = mocker.patch('cms.models.DataRecord.objects.filter')
        mock_data_record.return_value.last.return_value.value = article_url
        assert next(generate_preview_links(asset=mock_asset, state=state)) == (
            'Article Preview', f'/content/{article_url}?{params}')
        mock_asset.is_article = False

        # Test agreement preview
        mock_asset.is_agreement = True
        assert next(generate_preview_links(asset=mock_asset, state=state)) == (
            'Agreement Preview', f'/agreement?{params}')
        mock_asset.is_agreement = False

        # Test documentation preview
        # TODO

        # Test fallback
        mock_context = mocker.MagicMock()
        mock_context.url = str(uuid4())
        assert generate_preview_link(
            mock_context) == f'{mock_context.url}?preview=true'

    def test_generate_preview_link(self, mocker):
        mock_context = mocker.MagicMock()
        mock_context.url = str(uuid4())

        assert generate_preview_link() is None
        assert generate_preview_link(
            mock_context) == f'{mock_context.url}?preview=true'

    def test_generate_preview(self, mocker):
        mock_asset = mocker.MagicMock()
        mock_asset.is_cloud_portal = False
        mock_asset.can_preview_on_portal = False
        preview_link = str(uuid4())
        mock_generate_preview_link = mocker.patch(
            'cms.controllers.modify_db.generate_preview_link', return_value=preview_link)
        mock_fill_content = mocker.patch(
            'cms.controllers.filldata.fill_content')

        assert generate_preview(mock_asset) == preview_link
        mock_generate_preview_link.assert_called_once_with(
            None, asset=mock_asset, state=PENDING)
        mock_fill_content.assert_not_called()

        mock_asset.is_cloud_portal = mock_asset.can_preview_on_portal = True
        generate_preview(mock_asset)
        mock_fill_content.assert_called_once_with(
            mock_asset, preview=True, incremental=True, changed_context=None, version_id=None, send_to_review=False)

    def test_publish_latest_version(self, account_factory, asset_factory, mocker, db):
        mock_update_draft_state = mocker.patch(
            'cms.controllers.modify_db.update_draft_state', return_value=None)

        mock_fill_content = mocker.patch(
            'cms.controllers.filldata.fill_content', return_value=False)

        initial_state = AssetCustomizationReview.REVIEW_STATES.pending
        target_state = AssetCustomizationReview.REVIEW_STATES.accepted
        user = account_factory()
        asset, = asset_factory(
            state=initial_state, qty=1, account=user)
        review = AssetCustomizationReview.objects.filter(
            version__asset=asset).last()

        publish_errors = publish_latest_version(
            asset, review.id, user, target_state)

        assert not publish_errors
        mock_update_draft_state.assert_called_once_with(
            review.id, target_state, user)
        # mock_fill_content.assert_called_once_with(
        #     asset, preview=False, incremental=True)

    def test_asset_has_required_data(self, mocker):
        mock_asset = mocker.MagicMock()
        mock_asset.id = randint(1, 10000)
        mock_ds = mocker.MagicMock()
        mock_ds.label = mock_ds.name = str(uuid4())
        mock_ds.default = ''
        mock_ds.context.id = randint(1, 10000)
        last_record_value = ''
        mock_ds.datarecord_set.filter.return_value.last.return_value.value = last_record_value
        mock_ds.datarecord_set.filter.return_value.last.exists.return_value = False
        mocker.patch('cms.models.DataStructure.objects.filter',
                     return_value=[mock_ds])
        # Test json valid
        mock_ds.type = DataStructure.DATA_TYPES.object
        last_record_value = json.dumps({str(uuid4()): str(uuid4())})
        mock_ds.default = json.dumps({str(uuid4()): str(uuid4())})
        errors = asset_has_required_data(mock_asset)
        assert not errors

        # Test json invalid
        mock_ds.optional = False
        mock_ds.type = DataStructure.DATA_TYPES.object
        mock_ds.default = json.dumps({})
        last_record_value = json.dumps({})
        errors = asset_has_required_data(mock_asset)
        change_url = reverse('admin:change_page', kwargs={
                             'asset_id': mock_asset.id, 'context_id': mock_ds.context.id})
        field_required_error = (
            mock_ds.name, f'This field cannot be blank. Go to the <a href="{change_url}">{mock_ds.context.label}</a> page and fill in {mock_ds.name}.', change_url
        )
        assert field_required_error in errors

        # Test optional
        mock_ds.optional = True
        mock_ds.type = DataStructure.DATA_TYPES.text
        last_record_value = str(uuid4())
        errors = asset_has_required_data(mock_asset)
        assert not errors

        # Test not optional
        mock_ds.optional = False
        mock_ds.default = ''
        mock_ds.type = DataStructure.DATA_TYPES.text
        last_record_value = ''
        errors = asset_has_required_data(mock_asset)
        change_url = reverse('admin:change_page', kwargs={
                             'asset_id': mock_asset.id, 'context_id': mock_ds.context.id})
        field_required_error = (
            mock_ds.name, f'This field cannot be blank. Go to the <a href="{change_url}">{mock_ds.context.label}</a> page and fill in {mock_ds.name}.', change_url
        )
        assert field_required_error in errors

    def test_send_version_for_review(self, mocker):
        mock_old_version = mocker.MagicMock()
        mock_new_version = mocker.MagicMock()
        mock_content_version = mocker.patch(
            'cms.models.ContentVersion', return_value=mock_new_version)
        mock_content_version.objects.filter.return_value.filter.return_value.order_by.return_value.last.return_value = mock_old_version
        mock_context = mocker.patch('cms.models.Context')
        mock_context.objects = mocker.MagicMock()
        mock_asset = mocker.MagicMock()
        user = str(uuid4())

        mock_strip_version_from_records = mocker.patch(
            'cms.controllers.modify_db.strip_version_from_records')
        mock_update_records_to_version = mocker.patch(
            'cms.controllers.modify_db.update_records_to_version')
        mock_notify_version_ready = mocker.patch(
            'cms.controllers.modify_db.notify_version_ready')
        asset_errors = [str(uuid4())]
        mock_asset_has_required_data = mocker.patch(
            'cms.controllers.modify_db.asset_has_required_data', return_value=asset_errors)

        # Test send for review without notify
        mock_asset.is_integration = mock_asset.is_vms = False
        errors = send_version_for_review(mock_asset, user, notify=False)
        assert not errors
        mock_strip_version_from_records.assert_called_once()
        mock_new_version.save.assert_called_once_with()
        mock_update_records_to_version.assert_called_once()
        mock_new_version.create_reviews.assert_called_once()
        mock_notify_version_ready.assert_not_called()

        # Test notify
        send_version_for_review(mock_asset, user)
        mock_notify_version_ready.assert_called_once()

        # Test asset has errors
        mock_asset.is_integration = True
        errors = send_version_for_review(mock_asset, user)
        mock_asset_has_required_data.assert_called_once_with(mock_asset)
        assert asset_errors is errors

    def test_is_not_valid_file_type(self):
        invalid_type, *meta_types_list = [str(uuid4()) for _ in range(7)]
        valid_type = choice(meta_types_list)
        meta_types = ','.join(meta_types_list)

        assert is_not_valid_file_type(invalid_type, meta_types)
        assert not is_not_valid_file_type(valid_type, meta_types)

    def test_is_not_valid_file_extension(self):
        meta_types_list = [str(uuid4()) for _ in range(7)]
        meta_types = ','.join(meta_types_list)
        invalid_file_extension = f'{uuid4()}.{uuid4()}'
        valid_file_extension = f'{uuid4()}.{choice(meta_types_list)}'

        assert is_not_valid_file_extension(invalid_file_extension, meta_types)
        assert not is_not_valid_file_extension(
            valid_file_extension, meta_types)

    def test_get_image_dimensions(self):
        width, height = randint(1, 1000), randint(1, 1000)
        image_file = BytesIO()
        test_image = Image.new('RGB', (width, height))
        test_image.save(image_file, format='png')

        dimensions = get_image_dimensions(image_file)

        assert dimensions['width'] == width
        assert dimensions['height'] == height

    def test_check_image_dimensions(self):
        ds_name = uuid4()
        meta_dimensions_exact = {
            'height': 400,
            'width': 600
        }
        meta_dimensions_bounds = {
            'height_le': 500,
            'height_ge': 300,
            'width_le': 700,
            'width_ge': 500
        }

        # Test exact dimensions
        small_image = {'height': 250, 'width': 250}
        height_error = f"Image height must be equal to {meta_dimensions_exact['height']}. Uploaded image's height is {small_image['height']}."
        width_error = f"Image width must be equal to {meta_dimensions_exact['width']}. Uploaded image's width is {small_image['width']}."
        exact_errors = [error for _, error in check_image_dimensions(
            ds_name, meta_dimensions_exact, small_image)]
        assert len(exact_errors) == 2
        assert height_error in exact_errors
        assert width_error in exact_errors
        assert not check_image_dimensions(
            ds_name, meta_dimensions_exact, meta_dimensions_exact)

        # Test dimension ge constraints
        ge_errors = [error for _, error in check_image_dimensions(
            ds_name, meta_dimensions_bounds, small_image)]
        height_ge_error = f"Image height must be equal to or more than {meta_dimensions_bounds['height_ge']}. Uploaded image's height is {small_image['height']}."
        width_ge_error = f"Image width must be equal to or more than {meta_dimensions_bounds['width_ge']}. Uploaded image's width is {small_image['width']}."
        assert len(ge_errors) == 2
        assert height_ge_error in ge_errors
        assert width_ge_error in ge_errors

        # Test dimension le constraints
        large_image = {'height': 1000, 'width': 1000}
        le_errors = [error for _, error in check_image_dimensions(
            ds_name, meta_dimensions_bounds, large_image)]
        height_le_error = f"Image height must be equal to or less than {meta_dimensions_bounds['height_le']}. Uploaded image's height is {large_image['height']}."
        width_le_error = f"Image width must be equal to or less than {meta_dimensions_bounds['width_le']}. Uploaded image's width is {large_image['width']}."
        assert len(ge_errors) == 2
        assert height_le_error in le_errors
        assert width_le_error in le_errors

        # Test valid dimensions
        assert not check_image_dimensions(
            ds_name, meta_dimensions_bounds, meta_dimensions_exact)

    def test_has_wrong_image_sizes(self):
        required_image_sizes = [uuid4() for _ in range(5)]
        other_image_sizes = [uuid4() for _ in range(5)]

        assert not has_wrong_image_sizes(
            required_image_sizes + other_image_sizes, required_image_sizes)
        assert has_wrong_image_sizes(other_image_sizes, required_image_sizes)

    def test_check_meta_settings(self, mocker):
        width, height = 500, 500
        mocker.patch('cms.controllers.modify_db.get_image_dimensions',
                     return_value={'width': width, 'height': height})
        max_size = 512000
        valid_format = 'png'
        invalid_format = 'invalid'
        meta_settings = {
            'format': valid_format,
            'size': max_size
        }

        valid_name = f'{uuid4()}.{valid_format}'
        invalid_name = f'{uuid4()}.{invalid_format}'

        ds = baker.prepare(
            DataStructure, name=valid_name, meta_settings=meta_settings, type=DataStructure.DATA_TYPES.image)

        mock_valid_file, mock_invalid_format, mock_invalid_size = (
            mocker.MagicMock() for _ in range(3))

        mock_valid_file.configure_mock(
            size=max_size - 1, content_type=valid_format, name=valid_name)
        mock_invalid_format.configure_mock(
            size=max_size - 1, content_type=invalid_format, name=invalid_name)
        mock_invalid_size.configure_mock(
            size=max_size + 1, content_type=valid_format, name=valid_name)

        assert not check_meta_settings(ds, mock_valid_file)
        assert check_meta_settings(ds, mock_invalid_format)[
            0][1] == f"Invalid file type. Uploaded file is {mock_invalid_format.content_type}. It should be {valid_format.replace(',', ' or ')}."
        assert check_meta_settings(ds, mock_invalid_size)[
            0][1] == f"The file's size it too large. Its size was {mock_invalid_size.size/BYTES_TO_MEGABYTES:.2f}MB but must be less than {max_size/BYTES_TO_MEGABYTES:.2f}MB"

        multi_size_error = uuid4()
        mocker.patch('cms.controllers.modify_db.check_multi_size',
                     return_value=multi_size_error)
        assert check_meta_settings(ds, mock_valid_file) == multi_size_error

    def test_upload_file(self, mocker):
        max_size = settings.CMS_MAX_FILE_SIZE
        encoded_value = uuid4()
        mocker.patch('cms.controllers.modify_db.encode_file',
                     return_value=encoded_value)
        mock_regular_file = mocker.MagicMock()
        mock_large_file = mocker.MagicMock()
        mock_regular_file.configure_mock(size=max_size - 1)
        mock_large_file.configure_mock(size=max_size)

        mock_check_meta_settings = mocker.patch(
            'cms.controllers.modify_db.check_meta_settings', return_value=[])

        ds = baker.prepare(DataStructure)

        large_file_encoded, large_file_errors = upload_file(
            ds, mock_large_file)
        assert large_file_errors
        assert large_file_encoded is None

        regular_file_encoded, regular_file_errors = upload_file(
            ds, mock_regular_file)
        assert regular_file_encoded is encoded_value
        assert not regular_file_errors

        meta_settings_errors = uuid4()
        mock_check_meta_settings.return_value = [meta_settings_errors]
        meta_settings_file_encoded, meta_settings_file_errors = upload_file(
            ds, mock_regular_file)
        assert meta_settings_file_encoded is None
        assert meta_settings_errors in meta_settings_file_errors

    def test_process_file_or_image(self, mocker):
        file_errors = []
        new_record_value = str(uuid4())
        upload_file_state = (new_record_value, file_errors)
        mock_upload_file = mocker.patch(
            'cms.controllers.modify_db.upload_file', return_value=upload_file_state)
        ds_name = str(uuid4())
        mock_ds = mocker.MagicMock()
        mock_ds.optional = False
        request_files = {}
        request_data = {}
        state = RecordSaveState.new(
            data_structure_name=ds_name, data_structure=mock_ds, request_files=request_files, request_data=request_data)

        # Test upload
        request_files[ds_name] = str(uuid4())
        assert process_file_or_image(state)
        mock_upload_file.assert_called_once_with(
            mock_ds, request_files[ds_name])
        assert state.new_record_value == new_record_value
        assert not state.upload_errors

        # Test upload errors
        file_error = str(uuid4())
        file_errors.append(file_error)
        assert not process_file_or_image(state)
        assert state.new_record_value == new_record_value
        assert file_error in state.upload_errors
        request_files[ds_name] = False

        # Test delete
        delete_file = str(uuid4())
        request_data['delete_' + ds_name] = delete_file
        assert process_file_or_image(state)
        assert state.delete_file == delete_file
        request_data['delete_' + ds_name] = False

        # Test optional
        mock_ds.optional = True
        assert not process_file_or_image(state)

    def test_process_guid(self, mocker):
        mock_ds = mocker.MagicMock()
        mock_ds.optional = True
        invalid_guid = str(uuid4()).replace('-', '')
        ds_name = str(uuid4())
        valid_guid = '{' + str(uuid4()) + '}'
        valid_state = RecordSaveState.new(
            request_data={ds_name: valid_guid}, data_structure_name=ds_name, data_structure=mock_ds)
        invalid_state = RecordSaveState.new(
            request_data={ds_name: invalid_guid}, data_structure_name=ds_name, data_structure=mock_ds)
        assert process_guid(valid_state)

        assert not process_guid(invalid_state)
        assert (
            ds_name, f'Invalid GUID {invalid_state.new_record_value} it should formatted like {GUID_FORMAT}') in invalid_state.upload_errors

    def test_process_select(self, mocker):
        ds_name = str(uuid4())

        # multiselect
        mock_multi_select_ds = mocker.MagicMock()
        mock_multi_select_ds.type = DataStructure.DATA_TYPES.multiselect
        multi_select_values = [str(uuid4()) for _ in range(10)]
        multi_select_request_data = mocker.MagicMock()
        multi_select_request_data.getlist.return_value = multi_select_values
        multi_select_state = RecordSaveState.new(
            data_structure=mock_multi_select_ds, data_structure_name=ds_name, request_data=multi_select_request_data)

        assert process_select(multi_select_state)
        assert multi_select_state.new_record_value == multi_select_values

        # select
        mock_select_ds = mocker.MagicMock()
        mock_select_ds.type = DataStructure.DATA_TYPES.select
        select_value = str(uuid4())
        select_request_data = {ds_name: select_value}
        select_state = RecordSaveState.new(
            data_structure=mock_select_ds, data_structure_name=ds_name, request_data=select_request_data)

        assert process_select(select_state)
        assert select_value == select_value

    def test_process_external(self, mocker):
        ds_name = str(uuid4())
        mock_ds = mocker.MagicMock()
        mock_ds.optional = False
        mock_file = mocker.MagicMock()
        mock_file.file.url = str(uuid4())
        mock_asset = str(uuid4())
        request_files = {}
        request_data = {}
        file_errors = []
        mock_create_ext_file = mocker.patch(
            'cms.models.ExternalFile.objects.create', return_value=mock_file)
        mock_check_meta_settings = mocker.patch(
            'cms.controllers.modify_db.check_meta_settings', return_value=file_errors)
        state = RecordSaveState.new(
            asset=mock_asset, data_structure=mock_ds, request_files=request_files, data_structure_name=ds_name, request_data=request_data)

        # Test request file
        request_files[ds_name] = str(uuid4())
        assert process_external(state)
        mock_check_meta_settings.assert_called_once_with(
            state.data_structure, request_files[ds_name])
        mock_create_ext_file.assert_called_once_with(
            asset=state.asset, data_structure=state.data_structure, file=request_files[ds_name])
        assert not state.upload_errors

        # Test file errors
        file_error = str(uuid4())
        file_errors.append(file_error)
        assert not process_external(state)
        assert file_error in state.upload_errors
        request_files[ds_name] = False

        # Test delete
        request_data['delete_' + ds_name] = str(uuid4())
        assert process_external(state)
        assert state.delete_file == request_data['delete_' + ds_name]
        request_data['delete_' + ds_name] = False

        # Test request data
        request_data[ds_name] = str(uuid4())
        assert process_external(state)
        assert state.new_record_value == request_data[ds_name]

        # Test Optional
        assert process_external(state)
        mock_ds.optional = True
        request_data[ds_name] = False
        assert not process_external(state)

    def test_process_checkbox(self, mocker):
        ds_name = str(uuid4())
        new_record_state_and_advanced_ds = mocker.MagicMock()
        new_record_state_and_advanced = RecordSaveState.new(
            data_structure_name=ds_name, data_structure=new_record_state_and_advanced_ds, can_edit_advanced=True, request_data={ds_name: True})

        not_new_record_state_and_not_advanced_ds = mocker.MagicMock()
        not_new_record_state_and_not_advanced = RecordSaveState.new(
            data_structure_name=ds_name, data_structure=new_record_state_and_advanced_ds)

        not_new_record_state_and_not_advanced_ds.advanced = new_record_state_and_advanced_ds.advanced = True

        assert process_checkbox(
            new_record_state_and_advanced) and new_record_state_and_advanced.new_record_value
        assert not process_checkbox(
            not_new_record_state_and_not_advanced) and not not_new_record_state_and_not_advanced.new_record_value

    def test_process_integer(self, mocker):
        mock_ds = mocker.MagicMock()
        mock_ds.meta_settings = {}
        ds_name = str(uuid4())
        request_data = {}
        state = RecordSaveState.new(
            request_data=request_data, data_structure_name=ds_name, data_structure=mock_ds)

        # Invalid integer
        request_data[ds_name] = 'invalid'
        assert not process_integer(state)
        assert (ds_name, "This field has can only be integers.") in state.upload_errors

        # Valid integer
        int_value = randint(3, 11)
        request_data[ds_name] = int_value
        assert process_integer(state)

        # Integer below min
        min_value = int_value + 1
        request_data[ds_name] = int_value
        mock_ds.meta_settings = {'min': min_value}
        assert process_integer(state)
        assert state.has_error
        assert (
            ds_name, f"Value: {int_value} is less than the minimum: {min_value}") in state.upload_errors

        # Integer above max
        max_value = int_value - 1
        request_data[ds_name] = int_value
        mock_ds.meta_settings = {'max': max_value}
        assert process_integer(state)
        assert state.has_error
        assert (
            ds_name, f"Value: {int_value} is more than the maximum: {max_value}") in state.upload_errors

    def test_process_object_or_array(self, mocker):
        mock_ds = mocker.MagicMock()
        ds_name = str(uuid4())
        request_data = {ds_name: ''}
        state = RecordSaveState.new(
            data_structure=mock_ds, data_structure_name=ds_name, request_data=request_data)

        def set_type_and_value(ds_type, value):
            nonlocal mock_ds, ds_name, request_data
            mock_ds.type = ds_type
            request_data[ds_name] = value

        test_dict = {str(uuid4()): str(uuid4())
                     for _ in range(randint(1, 100))}
        test_list = [str(uuid4()) for _ in range(randint(1, 100))]

        json_error = (state.data_structure_name,
                      "Json was incorrectly formatted.")

        # valid dict
        set_type_and_value(DataStructure.DATA_TYPES.object,
                           json.dumps(test_dict))
        assert process_object_or_array(state)
        assert state.new_record_value == test_dict
        assert not state.upload_errors

        # invalid_dict
        set_type_and_value(DataStructure.DATA_TYPES.object,
                           json.dumps(test_list))
        assert not process_object_or_array(state)
        assert json_error in state.upload_errors
        state.upload_errors = []

        # valid list
        set_type_and_value(DataStructure.DATA_TYPES.array,
                           json.dumps(test_list))
        assert process_object_or_array(state)
        assert state.new_record_value == test_list
        assert not state.upload_errors

        # invalid list
        set_type_and_value(DataStructure.DATA_TYPES.array,
                           json.dumps(test_dict))
        assert not process_object_or_array(state)
        assert json_error in state.upload_errors
        state.upload_errors = []

    def test_process_other(self, mocker):
        mock_ds = mocker.MagicMock()
        mock_ds.meta_settings = {}
        ds_name = str(uuid4())
        request_data = {ds_name: str(uuid4())}
        state = RecordSaveState.new(
            data_structure=mock_ds, data_structure_name=ds_name, request_data=request_data)

        def reset_state():
            nonlocal state
            state.new_record_value = ''
            state.has_error = False
            state.upload_errors = []

        # No meta_settings
        assert process_other(state)
        assert not state.has_error
        assert not state.upload_errors
        reset_state()

        # regex valid
        mock_ds.meta_settings = {
            'regex': '[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$'}
        assert process_other(state)
        assert not state.has_error
        assert not state.upload_errors
        reset_state()

        # regex invalid
        mock_ds.meta_settings = {'regex': str(uuid4())}
        assert process_other(state)
        assert state.has_error
        assert (state.data_structure_name,
                'Invalid input') in state.upload_errors
        reset_state()

        # char_limit valid
        mock_ds.meta_settings = {'char_limit': 100}
        assert process_other(state)
        assert not state.has_error
        assert not state.upload_errors
        reset_state()

        # char_limit invalid
        char_limit = 1
        mock_ds.meta_settings = {'char_limit': char_limit}
        assert process_other(state)
        char_limit_error = (state.data_structure_name,
                            f'Character limit exceeded. Text was {len(state.new_record_value)} characters but should not be more than {char_limit} characters')
        assert state.has_error
        assert char_limit_error in state.upload_errors
        reset_state()

    def test_upload_image(self, mocker):
        content_file = str(uuid4())
        mock_file = mocker.MagicMock()
        mock_file.file.url = str(uuid4())
        state = RecordSaveState.new(
            asset=str(uuid4()), data_structure=str(uuid4()))
        mock_create_ext_file = mocker.patch(
            'cms.models.ExternalFile.objects.create', return_value=mock_file)
        src = upload_image(content_file, state)

        assert src == f'src="{mock_file.file.url}"'
        mock_create_ext_file.assert_called_once_with(
            asset=state.asset, data_structure=state.data_structure, file=content_file)

    def test_upload_data_image_match(self, mocker):
        mock_content_file_instance = str(uuid4())
        mock_file_src = str(uuid4())
        mock_content_file = mocker.patch(
            'django.core.files.base.ContentFile', return_value=mock_content_file_instance)
        mock_upload_image = mocker.patch(
            'cms.controllers.modify_db.upload_image', return_value=mock_file_src)
        mock_ds = mocker.MagicMock()
        mock_ds.name = str(uuid4())
        state = RecordSaveState.new(data_structure=mock_ds)
        buffer = BytesIO()
        test_image = Image.new(
            'RGB', size=(randint(10, 500), randint(10, 500)), color=(randint(0, 255), randint(0, 255), randint(0, 255)))
        test_image.save(buffer, 'png')
        img_b64 = base64.b64encode(buffer.getvalue()).decode('utf8')
        match_obj = str(uuid4()), img_b64
        result = upload_data_image_match(state)(match_obj)
        assert result == mock_file_src
        mock_upload_image.assert_called_once_with(
            mock_content_file_instance, state)

    def test_upload_imported_image(self, mocker):
        src = str(uuid4())
        mock_upload_image = mocker.patch(
            'cms.controllers.modify_db.upload_image', return_value=src)
        content_file = str(uuid4())
        match_key = str(uuid4())
        match_obj = [None, match_key]
        state = RecordSaveState.new(request_files={match_key: content_file})

        assert upload_imported_image(state)(match_obj) is src
        mock_upload_image.assert_called_once_with(content_file, state)

    def delete_abandoned_files(self):
        # TODO: Still need to add unit test
        assert False

    def test_process_html(self, mocker):
        mock_ds = mocker.MagicMock()
        data_image_src = f'src="data:image/{uuid4()};base64,{uuid4()}"'
        mock_delete_abandoned_files = mocker.patch(
            'cms.controllers.modify_db.delete_abandoned_files')
        mock_upload_data_image_match = mocker.patch(
            'cms.controllers.modify_db.upload_data_image_match')
        transformed_data_image_src = mock_upload_data_image_match.return_value.return_value = str(
            uuid4())

        import_image_src = 'src="{image_import:{' + str(uuid4()) + '}"'
        mock_upload_imported_image = mocker.patch(
            'cms.controllers.modify_db.upload_imported_image')
        transformed_import_image_src = mock_upload_imported_image.return_value.return_value = str(
            uuid4())

        state = RecordSaveState.new(
            data_structure=mock_ds, new_record_value=f'{data_image_src} {import_image_src}')

        mock_ds.meta_settings = {'upload_data_images': False}
        assert process_html(state)
        mock_delete_abandoned_files.assert_not_called()

        mock_ds.meta_settings = {'upload_data_images': True}
        assert process_html(state)
        assert state.new_record_value == f'{transformed_data_image_src} {transformed_import_image_src}'
        mock_delete_abandoned_files.assert_called_once_with(state)

    def test_check_optional_not_optional(self, mocker):
        mock_ds = mocker.MagicMock()

        mock_ds.optional = True
        assert check_optional(RecordSaveState.new(data_structure=mock_ds))

        mock_ds.optional = False
        assert not check_optional(RecordSaveState.new(data_structure=mock_ds))

    def test_check_optional_advanced(self, mocker):
        mock_ds = mocker.MagicMock()
        mock_ds.optional = False
        mock_ds.advanced = True

        assert not check_optional(RecordSaveState.new(data_structure=mock_ds))
        assert check_optional(RecordSaveState.new(
            data_structure=mock_ds, can_edit_advanced=True))

    def test_check_optional_default(self, mocker):
        def find_actual_value(default_value):
            def handler(*args, **kwargs):
                return default_value
            return handler
        default_value = str(uuid4())
        ds_name = str(uuid4())
        mock_ds = mocker.MagicMock()
        mock_ds.optional = False
        mock_ds.advanced = False
        mock_ds.default = default_value
        mock_ds.find_actual_value = find_actual_value(default_value)

        state_use_default = RecordSaveState.new(
            data_structure=mock_ds, data_structure_name=ds_name, records_exist=False)
        assert check_optional(state_use_default)
        assert (
            ds_name, "This field cannot be blank. Using default value") in state_use_default.upload_errors

        state_not_use_default = RecordSaveState.new(
            data_structure=mock_ds, data_structure_name=ds_name, records_exist=True)
        assert not check_optional(state_not_use_default)
        assert (
            ds_name, "This field cannot be blank") in state_not_use_default.upload_errors
