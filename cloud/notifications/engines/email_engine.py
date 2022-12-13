import logging
import json
import os

import pystache
from django.conf import settings
from django.core.cache import cache
from django.core.mail.backends.smtp import EmailBackend

from cms.controllers import filldata

logger = logging.getLogger(__name__)


def email_cache(customization_name, cache_type, value=None, force=None):
    data = cache.get('email_cache')
    global_id = 0
    if not data:
        data = {customization_name: {'version_id': global_id}}

    if customization_name in data and 'version_id' in data[customization_name]:
        from cms.models import check_update_cache
        global_force, global_id = check_update_cache(customization_name, data[customization_name]['version_id'])
        if not force:
            force = global_force

    if data and customization_name in data and 'version_id' in data[customization_name]\
            and data[customization_name]['version_id'] != global_id:
        force = True

    if not data:
        data = {}

    if customization_name not in data or force:
        data[customization_name] = {'version_id': global_id}

    if cache_type not in data[customization_name]:
        data[customization_name][cache_type] = {}

    if not value:
        return data[customization_name][cache_type]

    data[customization_name][cache_type] = value
    cache.set('email_cache', data)


EMAIL_CONFIG = ["portal_url", "smtp_host", "smtp_port", "smtp_password", "smtp_user", "smtp_tls", "mail_from_name", "mail_from_email"]


def send(email, msg_type, message, language_code, customization_name, subject='', attachments=None):
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
    if not subject:
        subject = get_email_title(customization_name, language_code, msg_type)
        subject = pystache.render(subject, {"message": message, "config": config})
        subject = subject.replace("\n", "")

    message_html_template = read_template(customization_name, msg_type, language_code, True)
    message_txt_template = read_template(customization_name, msg_type, language_code, False)

    email_html_body = pystache.render(message_html_template, {"message": message, "config": config})
    email_txt_body = pystache.render(message_txt_template, {"message": message, "config": config})

    email_from_name = customization_cache["mail_from_name"]
    email_from_email = customization_cache["mail_from_email"]
    email_from = '%s <%s>' % (email_from_name, email_from_email)

    mail_obj = EmailBackend(
        host=customization_cache["smtp_host"],
        port=int(customization_cache["smtp_port"]),
        password=str(customization_cache["smtp_password"]),
        username=str(customization_cache["smtp_user"]),
        use_tls=customization_cache["smtp_tls"],
    ) if not settings.TESTING else get_connection()

    msg = EmailMultiAlternatives(
        subject, email_txt_body, email_from, to=email, reply_to=customization_cache.get("reply_to"))
    msg.content_subtype = 'plain'  # Main content is now text/html
    msg.attach_alternative(email_html_body, "text/html")

    # msg = EmailMultiAlternatives(subject, email_html_body, email_from, to=(email,))
    # msg.content_subtype = 'html'  # Main content is now text/html
    # msg.attach_alternative(email_txt_body, "text/plain")

    msg.mixed_subtype = 'related'
    msg_img = MIMEImage(read_file(customization_name, 'templates/email_logo.png'), _subtype="png")
    msg_img.add_header('Content-ID', '<logo>')
    msg.attach(msg_img)

    if not attachments:
        attachments = []

    for attachment in attachments:
        msg.attach(attachment['filename'], attachment['content'], attachment['mimetype'])

    mail_obj.send_messages([msg])
    mail_obj.close()
    return True

NOTIFICATION_TEMPLATE_FILENAME = "templates/lang_{{language}}/notifications-language.json"
EMAIL_TITLES = 'email_titles'
EMAIL_SUBJECT = "emailSubject"

def get_email_title(customization_name, language_code, event):
    titles_cache = email_cache(customization_name, EMAIL_TITLES)
    if language_code not in titles_cache:
        data = read_file(customization_name, NOTIFICATION_TEMPLATE_FILENAME, language_code)
        titles_cache[language_code] = json.loads(data)
        email_cache(customization_name, EMAIL_TITLES, titles_cache)
    return titles_cache[language_code][event][EMAIL_SUBJECT]


def read_template(customization_name, name, language_code, html):
    suffix = ''
    if not html:
        suffix = '.txt'
    filename = os.path.join("templates/lang_{{language}}", name + suffix + '.mustache')
    return read_file(customization_name, filename, language_code)
    

def read_file(customization_name, filename, language_code=""):
    files_cache = email_cache(customization_name, 'files')
    translated_name = filename.replace("{{language}}", language_code)
    if translated_name not in files_cache:
        from cms.models import get_cloud_portal_asset
        files_cache[translated_name] = filldata.read_customized_file(filename,
                                                                     get_cloud_portal_asset(customization_name),
                                                                     language_code)
        email_cache(customization_name, 'files', files_cache)
    return files_cache[translated_name]
