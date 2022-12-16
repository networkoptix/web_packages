import base64
import pytest
from random import randint
from unittest.mock import call
from uuid import uuid4
from notifications.engines.email_engine import *


class TestEmailEngine:
    def test_email_cache(self, mocker, mock_cache):
        cache_mock = mock_cache('notifications.engines.email_engine.cache')
        customization_name, cache_type, value = [
            str(uuid4()) for _ in range(3)]
        expected_version_id = randint(1, 1000)

        mocker.patch(
            'cms.models.check_update_cache', return_value=[False, expected_version_id])

        email_cache(customization_name, cache_type, value)

        version_id = cache_mock.get('email_cache')[customization_name]['version_id']

        assert email_cache(customization_name, cache_type) == value
        assert version_id == expected_version_id

    def test_send(self, mocker):
        address, domain, msg_type, subject, body, language_code, customization_name, *attachments = [
            str(uuid4()) for _ in range(randint(15, 20))]
        message = {'subject': subject, 'body': body}
        email = f'{address}@{domain}.com'
        email_subject_template = '{{message.subject}} {{config.portal_url}}'
        email_body_template = '{{message.body}} {{config.portal_url}}'

        portal_url, *email_config = EMAIL_CONFIG
        customization_cache = {config: str(uuid4()) for config in email_config}
        customization_cache['reply_to'] = str(uuid4())

        mocker.patch(
            'cms.models.cloud_portal_customization_cache', return_value=customization_cache)
        mock_get_email_title = mocker.patch(
            'notifications.engines.email_engine.get_email_title', return_value=email_subject_template)
        mock_read_template = mocker.patch(
            'notifications.engines.email_engine.read_template', return_value=email_body_template)
        mocker.patch(
            'notifications.engines.email_engine.read_file', return_value=b'')
        mock_connection = mocker.MagicMock()
        mocker.patch('django.core.mail.get_connection',
                     return_value=mock_connection)
        mock_msg = mocker.MagicMock()
        mock_email_multi_alternatives = mocker.patch(
            'django.core.mail.EmailMultiAlternatives', return_value=mock_msg)
        mock_img = mocker.MagicMock()
        mock_mime_image = mocker.patch(
            'email.mime.image.MIMEImage', return_value=mock_img)

        # Test missing config
        assert not send(email, msg_type, message,
                        language_code, customization_name)

        # Test with correct config
        customization_cache['portal_url'] = str(uuid4())
        expected_subject = f'{message["subject"]} {customization_cache["portal_url"]}'
        expected_body = f'{message["body"]} {customization_cache["portal_url"]}'
        expected_email_from = f'{customization_cache["mail_from_name"]} <{customization_cache["mail_from_email"]}>'
        expected_attachments = [
            {'filename': f'{attachment}.txt',
            'content': attachment.encode('utf-8'),
            'mimetype': 'text/plain'
            } for attachment in attachments
        ]
        assert send(email, msg_type, message,
                    language_code, customization_name, attachments=expected_attachments)
        mock_get_email_title.assert_called_once_with(
            customization_name, language_code, msg_type)
        mock_read_template.assert_has_calls(
            call(customization_name, msg_type, language_code, is_html) for is_html in [True, False])
        mock_email_multi_alternatives.assert_called_once_with(
            expected_subject, expected_body, expected_email_from, to=(email,), reply_to=customization_cache['reply_to'])
        mock_mime_image.assert_called_once_with(b'', _subtype="png")
        mock_msg.attach_alternative.assert_called_once_with(
            expected_body, 'text/html')
        assert mock_msg.content_subtype == 'plain'
        assert mock_msg.mixed_subtype == 'related'
        mock_img.add_header.assert_called_once_with('Content-ID', '<logo>')
        added_attachments = [call(f'{attachment}.txt', attachment.encode(), 'text/plain') for attachment in attachments]
        mock_msg.attach.assert_has_calls(
            [call(mock_img), *added_attachments]
        )
        mock_connection.send_messages.assert_called_once_with([mock_msg])
        mock_connection.close.assert_called_once()

    def test_get_email_title(self, mocker):
        language_code, customization_name, event, subject = [
            str(uuid4()) for _ in range(4)]
        data = {event: {EMAIL_SUBJECT: subject}}
        cache_value = {language_code: data}
        mock_email_cache = mocker.patch(
            'notifications.engines.email_engine.email_cache', return_value=cache_value)
        mock_read_file = mocker.patch(
            'notifications.engines.email_engine.read_file', return_value=json.dumps(data))

        # Test cached title
        assert get_email_title(
            customization_name, language_code, event) == subject
        mock_email_cache.assert_called_once_with(
            customization_name, EMAIL_TITLES)
        assert mock_read_file.call_count == 0

        # Test title from template
        language_code = str(uuid4())
        assert get_email_title(
            customization_name, language_code, event) == subject
        mock_read_file.assert_called_once_with(
            customization_name, NOTIFICATION_TEMPLATE_FILENAME, language_code)
        mock_email_cache.assert_has_calls([
            call(customization_name, EMAIL_TITLES),
            call(customization_name, EMAIL_TITLES, cache_value)
        ], any_order=True)

    def test_read_template(self, mocker):
        def get_path(filename):
            return f'templates/lang_{{{{language}}}}/{filename}.mustache'
        customization_name, name, language_code, mock_file = [
            str(uuid4()) for _ in range(4)]
        mock_read_file = mocker.patch(
            'notifications.engines.email_engine.read_file', return_value=mock_file)

        html_path = get_path(name)
        non_html_path = get_path(name + '.txt')

        for is_html in [True, False]:
            assert read_template(
                customization_name, name, language_code, is_html) == mock_file

        mock_read_file.assert_has_calls([
            call(customization_name, html_path, language_code), call(customization_name, non_html_path, language_code)])

    def test_read_file(self, mocker):
        customization_name, file_dir, file, language_code, mock_file, mock_cloud_portal_asset = [
            str(uuid4()) for _ in range(6)]
        filename = '{{language}}' + f'/{file}'
        mock_email_cache = mocker.patch(
            'notifications.engines.email_engine.email_cache', return_value={})
        mocker.patch(
            'cms.controllers.filldata.read_customized_file', return_value=mock_file)
        mocker.patch(
            'cms.models.get_cloud_portal_asset', return_value=mock_cloud_portal_asset)

        assert read_file(customization_name, filename,
                         language_code=language_code) == mock_file
        mock_email_cache.assert_has_calls([
            call(customization_name, 'files'), call(customization_name, 'files', mock_email_cache.return_value)])
