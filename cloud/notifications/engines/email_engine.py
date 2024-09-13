import logging
import json
import os

import pystache
from django.conf import settings
from django.core.mail.backends.smtp import EmailBackend
from cms.controllers.static_files import read_cached_file, TemplatesCache, read_customized_db_file
from cms.models import Asset
import imghdr

logger = logging.getLogger(__name__)
EMAIL_CONFIG = ["portal_url", "smtp_host", "smtp_port", "smtp_password", "smtp_user", "smtp_tls", "mail_from_name", "mail_from_email"]


def send(email, msg_type, message, language_code, customization_name, subject='', attachments=None, cloud_wrapper=True):
    from email.mime.image import MIMEImage  # python 3
    from cms.models import cloud_portal_customization_cache
    from django.core.mail import EmailMultiAlternatives, get_connection

    try:
        email = json.loads(email)
    except json.JSONDecodeError:
        email = (email,)

    customization_cache = cloud_portal_customization_cache(customization_name, 'email')
    if any(
        config_key not in customization_cache for config_key in EMAIL_CONFIG
    ):
        logger.error(f"Some smtp config settings are missing from {customization_name}. "
                     f"Please notify Release engineers")
        return False

    config = {
        'portal_url': customization_cache["portal_url"]
    }
    from cms.models import get_cloud_portal_asset
    asset = get_cloud_portal_asset(customization=customization_name)
    version_id = asset.version_id(customization_name)
    skin = asset.read_global_value("%SKIN%")
    if not subject:
        subject = read_cached_email_title(asset, customization_name, language_code, msg_type, skin, version_id)
        subject = pystache.render(subject, {"message": message, "config": config})
        subject = subject.replace("\n", "")

    if cloud_wrapper:

        message_html_template = read_cached_template(asset, customization_name, msg_type,
                                                    language_code, True, skin, version_id)
        message_txt_template = read_cached_template(asset, customization_name, msg_type,
                                                    language_code, False, skin, version_id)

        email_html_body = pystache.render(message_html_template, {"message": message, "config": config})
        email_txt_body = pystache.render(message_txt_template, {"message": message, "config": config})
    else:
        # Need to wrap so that gmail doesn't think that it's a quoted reply
        email_html_body = f'<div style="display:inline-block;">{message.get("html_body", "")}</div>'
        email_txt_body = message.get('text_body', '')

    email_from_name = customization_cache["mail_from_name"]
    email_from_email = customization_cache["mail_from_email"]
    email_from = '%s <%s>' % (email_from_name, email_from_email)

    mail_obj = EmailBackend(
        host=customization_cache["smtp_host"],
        port=int(customization_cache["smtp_port"]),
        password=str(customization_cache["smtp_password"]),
        username=str(customization_cache["smtp_user"]),
        use_tls=customization_cache["smtp_tls"],
    ) if not settings.TESTING and not settings.PRIVATE_CLOUD else get_connection()

    reply_to = None
    if reply_to_email := customization_cache.get("reply_to"):
        reply_to = [reply_to_email]

    msg = EmailMultiAlternatives(
        subject, email_txt_body, email_from, to=email, reply_to=reply_to)
    msg.content_subtype = 'plain'  # Main content is now text/html
    msg.attach_alternative(email_html_body, "text/html")

    # msg = EmailMultiAlternatives(subject, email_html_body, email_from, to=(email,))
    # msg.content_subtype = 'html'  # Main content is now text/html
    # msg.attach_alternative(email_txt_body, "text/plain")

    msg.mixed_subtype = 'related'
    include_cloud_logo = cloud_wrapper or 'src="cid:logo"' in email_html_body
    if include_cloud_logo:
        msg_img = MIMEImage(read_cached_file(asset, customization_name,
                                            'templates/email_logo.png',
                                            language_code, skin, version_id),
                            _subtype="png")
        msg_img.add_header('Content-ID', '<logo>')
        msg.attach(msg_img)

    if not attachments:
        attachments = []

    for attachment in attachments:
        filename_not_logo = attachment['filename'] != 'logo'
        # Checking if jpeg this way since imghdr.what seems to have issues with the jpeg from mediaserver
        is_jpeg = attachment['filename'].endswith('.jpeg')
        include_cid_header = filename_not_logo and (is_jpeg or imghdr.what(None, attachment['content']) == 'png')

        if include_cid_header:
            # Handle images used in emails from mediaserver
            message_icon = MIMEImage(attachment['content'], _subtype="jpeg" if is_jpeg else "png")
            message_icon.add_header('Content-Disposition', f'attachment; filename= {attachment["filename"]}')
            message_icon.add_header('Content-ID', f'<{attachment["filename"]}>')
            msg.attach(message_icon)
        elif filename_not_logo or not include_cloud_logo:
            msg.attach(attachment['filename'], attachment['content'], attachment['mimetype'])

    mail_obj.send_messages([msg])
    mail_obj.close()
    return True


NOTIFICATION_TEMPLATE_FILENAME = "templates/lang_{{language}}/notifications-language.json"
EMAIL_TITLES = 'email_titles'
EMAIL_SUBJECT = "emailSubject"


def read_cached_template(asset: Asset, customization_name: str, filename: str,
                         language_code: str, html: bool, skin: str, version_id: int):
    """
    Tries to get template content from cache, if it is missed then loads value from DB.
    Args:
        asset (Asset, required): cloud portal asset
        customization_name (str, required): customization name
        filename (str, required): file/template name
        language_code (str, required): language code
        html (bool, required): is template a html file
        skin (str, required): skin name
        version_id (int, required): asset review version id

    Returns str: returns template string

    """
    suffix = ''
    if not html:
        suffix = '.txt'
    filename = os.path.join("templates/lang_{{language}}", filename + suffix + '.mustache')
    return read_cached_file(asset, customization_name, filename, language_code, skin, version_id, is_email=True)


def read_cached_email_title(asset: Asset, customization_name: str,
                            language_code: str, event: str, skin: str, version_id: int):
    """
    Tries to get `notifications-language.json` file for `language_code` from cache,
     if it is missed then loads value from DB.
    Args:
        asset (Asset, required): cloud portal asset
        customization_name (str, required): customization name
        language_code (str, required): language code
        event (str, required): message type
        skin (str, required): skin name
        version_id (int, required): asset review version id

    Returns str: returns title string

    """
    templates_cache = TemplatesCache(customization_name, NOTIFICATION_TEMPLATE_FILENAME,
                                     language_code, skin, version_id)
    if data := templates_cache.get_value():
        return data[event][EMAIL_SUBJECT]
    data = read_customized_db_file(asset, customization_name, NOTIFICATION_TEMPLATE_FILENAME,
                                   language_code, skin, version_id)
    data = json.loads(data)
    templates_cache.set_value(data)
    return data[event][EMAIL_SUBJECT]
