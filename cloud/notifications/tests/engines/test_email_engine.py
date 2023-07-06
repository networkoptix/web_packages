import base64
from random import randint
from unittest.mock import call
from uuid import uuid4

from model_bakery import baker

from notifications.engines.email_engine import *


class TestEmailEngine:
    def test_email_templates_cache(self):
        customization_name = settings.TEST_CUSTOMIZATION
        version_id = randint(1000, 2000)
        skin = 'blue'
        filename = f'{uuid4()}'
        language_code = 'en_US'
        cache = TemplatesCache(customization_name, filename, language_code, skin, version_id)
        assert cache.cache_name == 'templates'
        assert cache.hash_key == f'templates-{customization_name}-{settings.VERSION}'
        assert cache.field_key == f'{filename}-{language_code}-{skin}-{version_id}'

    def test_send(self, mocker, default_portal):
        address, domain, msg_type, subject, body, language_code, customization_name, *attachments = [
            str(uuid4()) for _ in range(randint(15, 20))]
        message = {'subject': subject, 'body': body}
        email = f'{address}@{domain}.com'
        email_subject_template = '{{message.subject}} {{config.portal_url}}'
        email_body_template = '{{message.body}} {{config.portal_url}}'
        version_id = randint(1000, 2000)
        skin = 'blue'
        portal_url, *email_config = EMAIL_CONFIG
        customization_cache = {config: str(uuid4()) for config in email_config}
        customization_cache['reply_to'] = str(uuid4())
        mocker.patch('cms.models.get_cloud_portal_asset', return_value=default_portal)
        mocker.patch('cms.models.Asset.version_id', return_value=version_id)
        mocker.patch('cms.models.Asset.read_global_value', return_value=skin)
        mocker.patch(
            'cms.models.cloud_portal_customization_cache', return_value=customization_cache)
        mock_get_email_title = mocker.patch(
            'notifications.engines.email_engine.read_cached_email_title', return_value=email_subject_template)
        mock_read_template = mocker.patch(
            'notifications.engines.email_engine.read_cached_template', return_value=email_body_template)
        mocker.patch(
            'notifications.engines.email_engine.read_cached_file', return_value=b'')
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
            default_portal, customization_name, language_code, msg_type, skin, version_id)
        mock_read_template.assert_has_calls(
            call(default_portal, customization_name, msg_type, language_code, is_html, skin, version_id) for is_html in [True, False])
        mock_email_multi_alternatives.assert_called_once_with(
            expected_subject, expected_body, expected_email_from, to=(email,), reply_to=[customization_cache['reply_to']])
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

    def test_read_cached_email_title(self, mocker, default_portal):
        event, subject = [
            str(uuid4()) for _ in range(2)]
        version_id = randint(1000, 2000)
        language_code = 'en_US'
        customization_name = settings.TEST_CUSTOMIZATION
        skin = 'blue'
        data = {event: {EMAIL_SUBJECT: subject}}
        cache_value = {event: {EMAIL_SUBJECT: subject}}
        mock_email_cache = mocker.patch(
            'notifications.engines.email_engine.TemplatesCache.get_value', return_value=cache_value)
        mock_read_file = mocker.patch(
            'notifications.engines.email_engine.read_db_context_template', return_value=json.dumps(data))

        # Test cached title
        assert read_cached_email_title(
            default_portal, customization_name, language_code, event, skin, version_id) == subject
        mock_email_cache.assert_called_once()
        assert mock_read_file.call_count == 0

        # Test title from db template
        mock_email_cache = mocker.patch(
            'notifications.engines.email_engine.TemplatesCache.get_value', return_value=None)
        mock_read_file = mocker.patch(
            'notifications.engines.email_engine.read_db_context_template', return_value=json.dumps(data))
        assert read_cached_email_title(
            default_portal, customization_name, language_code, event, skin, version_id) == subject
        mock_read_file.assert_called_once_with(
            default_portal, customization_name, NOTIFICATION_TEMPLATE_FILENAME, language_code, skin, version_id)

    def test_read_cached_template(self, mocker, default_portal):
        def get_path(filename):
            return f'templates/lang_{{{{language}}}}/{filename}.mustache'
        customization_name, name, language_code, mock_file = [
            str(uuid4()) for _ in range(4)]
        version_id = randint(1000, 2000)
        skin = 'blue'
        mock_read_file = mocker.patch(
            'cms.controllers.static_files.read_db_email_file', return_value=mock_file)

        html_path = get_path(name)
        non_html_path = get_path(name + '.txt')
        # Test with cache first call requests db and fills cache
        for is_html in [True, False]:
            assert read_cached_template(
                default_portal, customization_name, name, language_code, is_html, skin, version_id) == mock_file

        mock_read_file.assert_has_calls([
            call(default_portal, customization_name, html_path, language_code, skin, version_id),
            call(default_portal, customization_name, non_html_path, language_code, skin, version_id)
        ])
        # second call gets data from db
        mock_read_file = mocker.patch(
            'cms.controllers.static_files.read_db_email_file', return_value=mock_file)

        for is_html in [True, False]:
            assert read_cached_template(
                default_portal, customization_name, name, language_code, is_html, skin, version_id) == mock_file
        mock_read_file.assert_not_called()
