from concurrent.futures import wait, as_completed
import json
import re
from uuid import UUID, uuid4

from jsonfield import JSONField
from django.db import models
from django.utils import timezone
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxLengthValidator, validate_email
from django.db.models import Q, F, Value
from django.db.models.functions import Concat
from django.core.cache import caches
from html2text import html2text
from model_utils import Choices
from push_notifications.gcm import FCM_NOTIFICATIONS_PAYLOAD_KEYS, FCM_OPTIONS_KEYS, GCMError
from push_notifications.models import GCMDevice, GCMDeviceQuerySet
from rest_framework import serializers

import botocore

from cloud.customization_context import ContextExecutor, customization_ctx
from cms.models import Customization, Asset, DataStructure
from api.models import Account

from .conf import get_sns_client

# Monkey patch to add extra keys to be used in the "notification" object in the request to fcm
FCM_NOTIFICATIONS_PAYLOAD_KEYS.extend(['image', 'apns', 'subtitle'])
FCM_OPTIONS_KEYS.append('mutable_content')

# When cloudportal is ran locally it uses amqp by default. BROKER_TRANSPORT_OPTIONS is related to sqs.
# This allows cloud notifications to run locally without changing settings to use sqs.
USE_SQS_FOR_CLOUD_NOTIFICATIONS = hasattr(
    settings, "CELERY_BROKER_TRANSPORT_OPTIONS")

RELAY_GUID_PATTERN = re.compile(
    '([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(/)')

NOPTIXQA_SENDEMAILS_PATTERN = re.compile(
    r'^[a-zA-Z0-9_.+-]*noptixautoqa[a-zA-Z0-9_.+-]*\+[a-zA-Z0-9_.+-]*sendemail[a-zA-Z0-9_.+-]*@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')


class MessageTypes(object):
    contact_sales = "contact_sales"
    contact_support = "contact_support"
    integration_feedback = "integration_feedback"
    ipvd_feedback_page = "ipvd_feedback_page"
    ipvd_feedback_device = "ipvd_feedback_device"
    ipvd_feedback = "ipvd_feedback"

    def keys(self):
        return list(filter(lambda k: not k.startswith("__", 0, 2) and k != "keys", dir(self)))


class Event(models.Model):
    object = models.CharField(max_length=255)
    type = models.CharField(max_length=255)
    data = JSONField()
    created_date = models.DateTimeField(auto_now_add=True)
    send_date = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f'{self.object} - {self.type}'

    def send(self, *, customization=None, request=None):
        self.save()
        customization = customization or getattr(request, 'CUSTOMIZATION', customization_ctx.get())
        # 1. Get all subscriptions for this event
        subscriptions = Subscription.objects.filter(Q(type=self.type, object='') |
                                                    Q(type='', object=self.object) |
                                                    Q(type=self.type, object=self.object))

        if settings.NOTIFICATIONS_AUTO_SUBSCRIBE and not subscriptions.exists():
            subscription = Subscription(
                type=self.type,
                user_email=settings.NOTIFICATIONS_AUTO_SUBSCRIBE,
                enabled=True
            )
            subscription.save()
            subscriptions = subscriptions.filter()

        subscriptions = subscriptions.filter(Q(enabled=True) | Q(enabled=1))
        # 2. For each subscription create a message and send it
        for subscription in subscriptions.all():
            user = Account.objects.filter(
                email=subscription.user_email).first()

            if user:
                self.data = {
                    'userFullName': user.get_full_name(),
                    **json.loads(self.data)
                }

            message = Message(
                message=self.data,
                user_email=subscription.user_email,
                customization=user.customization if user else customization,
                type=self.type,
                event=self
            )
            message.send(customization=customization)
        self.send_date = timezone.now()
        self.save()


class Subscription(models.Model):
    object = models.CharField(max_length=255, default='', blank=True,
                              help_text="What's the target? (release type, customization or cloud instance)")
    type = models.CharField(max_length=255, default='', blank=True,
                            help_text="What's the event? (submitted_release, published_{{type}}, cloud_...)")
    user_email = models.EmailField()
    created_date = models.DateTimeField(auto_now_add=True)
    enabled = models.BooleanField(default=True)

    def __str__(self):
        return f'{self.object} - {self.type}'


class Message(models.Model):
    user_email = models.TextField()
    external_id = models.CharField(
        max_length=64, db_index=True, unique=True, blank=True, null=True)
    task_id = models.CharField(max_length=50, blank=True, editable=False)
    type = models.CharField(max_length=255)
    customization = models.CharField(max_length=255, default='default')
    message = JSONField()
    created_date = models.DateTimeField(auto_now_add=True)
    send_date = models.DateTimeField(null=True, blank=True)
    event = models.ForeignKey(Event, null=True, on_delete=models.CASCADE)

    REQUIRED_FIELDS = ['user_email', 'type', 'message']

    def __str__(self):
        return f'{self.type} - {self.user_email}'

    def send(self, *, customization=None, request=None):
        self.save()
        customization = self.customization

        # TODO: initiate business-logic here

        # Skips noptixautoqa emails unless they have sendemail in the alias
        if 'noptixautoqa' in self.user_email and not NOPTIXQA_SENDEMAILS_PATTERN.match(self.user_email):
            self.send_date = timezone.now()
            self.save()
            return

        from notifications.tasks import send_email

        if settings.USE_ASYNC_QUEUE and USE_SQS_FOR_CLOUD_NOTIFICATIONS:
            queue_name = "cloud-emails"
            if 'queue' in settings.NOTIFICATIONS_CONFIG[self.type]:
                queue_name = settings.NOTIFICATIONS_CONFIG[self.type]['queue']

            result = send_email.apply_async(
                args=[self.id], queue=queue_name, customization=customization)
            self.task_id = result.task_id
        else:
            send_email(self.id, customization=customization)
            self.task_id = 'sync'

        self.save()

    def delivery_time_interval(self):
        if not self.send_date:
            return "Message has not been sent yet"
        return (self.send_date - self.created_date).total_seconds()

    delivery_time_interval.short_description = "Delivery Time Interval (sec)"


class Feedback(models.Model):
    created_date = models.DateTimeField(auto_now_add=True)
    message = models.TextField(default='', blank=True)
    asset_name = models.CharField(max_length=255)
    sender_name = models.CharField(max_length=255)
    sender_email = models.CharField(max_length=255)
    target_asset = models.ForeignKey(Asset, on_delete=models.CASCADE)
    type = models.CharField(max_length=255)

    def __str__(self):
        return f'{self.asset_name} - {self.type}'

    def send(self, *, customization=None, request=None):
        customization = customization or getattr(request, 'CUSTOMIZATION', customization_ctx.get())
        self.save()
        data = {
            'sender_name': self.sender_name,
            'sender_email': self.sender_email,
            'asset': self.asset_name,
            'message': self.message
        }
        event = Event.objects.create(
            type=self.type, object=self.target_asset.id, data=data)
        event.send(customization=customization)

        # Send email to the contact email for an integration.
        data_structure = DataStructure.objects.filter(
            name__in=['supportEmail', '%SUPPORT_EMAIL%'], context__asset_type=self.target_asset.asset_type,
            context__name__in=['support', 'Settings']
        ).last()
        contact_email = data_structure.find_actual_value(
            asset=self.target_asset, version_id=self.target_asset.version_id()
        )
        emails = [self.sender_email]
        if contact_email:
            emails.append(contact_email)

        msg = Message.objects.create(
            user_email=json.dumps(emails),
            type=self.type,
            customization=customization,
            message=data,
            event=event
        )
        msg.send(customization=customization)


# model to use when checking on message status
class MessageStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ('external_id', 'task_id', 'type',
                  'customization', 'created_date', 'send')


class CloudNotification(models.Model):
    class Meta:
        permissions = (
            ("send_cloud_notification", "Can send cloud notifications"),
        )

    subject = models.CharField(max_length=255)
    body = models.TextField()
    customizations = models.ManyToManyField(Customization)
    sent_date = models.DateTimeField(null=True, blank=True)
    sent_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        related_name='accepted_%(class)s', on_delete=models.CASCADE)

    def __str__(self):
        return self.subject


class PushSubscription(models.Model):
    SUB_TYPES = Choices((0, 'cloud', 'cloud'), (1, 'local', 'local'))
    type = models.IntegerField(choices=SUB_TYPES, default=SUB_TYPES.cloud)

    system_id = models.CharField(max_length=255, unique=True)
    # active = models.BooleanField(default=True)
    # device = models.ForeignKey(PushDevice, blank=True, null=True, on_delete=models.CASCADE, related_name='subscriptions')

    # account = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True, on_delete=models.CASCADE)
    # subscription_id = models.UUIDField(blank=True, null=True)
    # username = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f'{self.SUB_TYPES[self.type]} - {self.system_id}'


class PushDeviceQuerySet(GCMDeviceQuerySet):
    def send_message(self, message, **kwargs):
        try:
            super().send_message(message, **kwargs)
        except GCMError as gcm_error:
            return gcm_error.args[0],


class PushDeviceManager(models.Manager):
    def get_queryset(self):
        return PushDeviceQuerySet(self.model)


class PushDevice(GCMDevice):
    OS = Choices((0, 'web', 'Web'),
                 (1, 'android', 'Android'),
                 (2, 'ios', 'iOS'))
    TYPES = Choices((0, 'notification', 'notification'),
                    (1, 'data', 'data'))
    PROVIDERS = Choices((0, 'firebase_legacy', 'Firebase Legacy'),
                        (1, 'firebase', 'Firebase'),
                        (2, 'apn', 'APN'),
                        (3, 'baidu', 'Baidu'),
                        (4, 'apn_sandbox', 'APN Sandbox'))
    model = models.CharField(max_length=255)
    subscriptions = models.ManyToManyField(PushSubscription)
    os = models.IntegerField(choices=OS, default=OS.web)
    type = models.IntegerField(choices=TYPES, default=TYPES.notification)
    provider = models.IntegerField(
        choices=PROVIDERS, default=PROVIDERS.firebase_legacy)
    arn = models.CharField(max_length=255, blank=True)
    # userId from baidu push service
    baidu_user_id = models.CharField(max_length=255, blank=True)

    objects = PushDeviceManager()

    def send_message(self, *args, **kwargs):
        try:
            return super().send_message(*args, **kwargs)
        except GCMError as gcm_error:
            return gcm_error.args[0]

    @staticmethod
    async def delete_for_account(account):
        await PushDevice.objects.filter(user=account).adelete()

    def __str__(self):
        return self.name or 'Unnamed Device'


class PushNotification(models.Model):
    SIZE_LIMIT = 4000
    RESULT_STATES = Choices(('open', 'Open'),
                            ('in_progress', 'In Progress'),
                            ('success', 'Success'),
                            ('failure', 'Failure'))

    title = models.CharField(max_length=255, blank=True)
    body = models.TextField(max_length=SIZE_LIMIT, validators=[
                            MaxLengthValidator(SIZE_LIMIT)], blank=True)
    payload = models.TextField(
        max_length=SIZE_LIMIT, blank=True, null=True, validators=[MaxLengthValidator(SIZE_LIMIT)]
    )
    options = models.TextField(blank=True, null=True)
    devices = models.ManyToManyField(PushDevice)

    raw_system_id = models.CharField(max_length=255, default='')
    raw_targets = models.TextField(null=True)
    result_data = models.TextField(null=True, blank=True)
    customization = models.ForeignKey(
        Customization, blank=True, null=True, on_delete=models.SET_NULL)
    count = models.IntegerField(default=0)

    created_date = models.DateTimeField(auto_now_add=True)
    send_date = models.DateTimeField(null=True, blank=True)
    state = models.CharField(choices=RESULT_STATES,
                             default=RESULT_STATES.open, max_length=20, db_index=True)

    def __str__(self):
        return self.title or 'Untitled Notification'

    def clean(self):
        if len(self.title + self.body + (self.payload or '')) > self.SIZE_LIMIT:
            raise ValidationError(
                f'Title, body, and payload cannot total more than {self.SIZE_LIMIT}')
        super(PushNotification, self).clean()

    def save(self, *args, **kwargs):
        self.full_clean()
        super(PushNotification, self).save(*args, **kwargs)

    def sub_traffic_relay(self, url):
        match = RELAY_GUID_PATTERN.search(url)
        if match:
            system_id = match.groups()[0]
            relay_host = settings.TRAFFIC_RELAY_HOST.replace(
                '{systemId}', system_id)
            url = url.replace(system_id, relay_host)
        return url

    def send_notifications(self, device_ids=None, devices=None):
        from .engines.sns_push import send_sns_push, generate_provider_specific_messages
        if device_ids is None and devices is None:
            raise ValueError(
                'Either device_ids or devices must be passed as an argument')

        if device_ids:
            devices = PushDevice.objects.filter(id__in=device_ids)

        devices = devices.annotate(
            targets=Concat(Value('["'), F('user__email'), Value('"]'))
        )
        firebase_legacy_devices = devices.filter(
            provider=PushDevice.PROVIDERS.firebase_legacy)
        sns_devices = devices.filter(
            ~Q(provider=PushDevice.PROVIDERS.firebase_legacy))

        title = self.title or None
        body = self.body or None
        payload = json.loads(self.payload) if self.payload else {}
        image_url = payload.get('imageUrl', None)
        if image_url:
            payload['imageUrl'] = self.sub_traffic_relay(image_url)
        payload['systemId'] = self.raw_system_id
        options = json.loads(self.options) if self.options else {}

        # Firebase Legacy
        notification_devices = firebase_legacy_devices.filter(
            type=PushDevice.TYPES.notification)
        data_devices = firebase_legacy_devices.filter(
            type=PushDevice.TYPES.data)

        # Multithreading to deal with lots of network I/O delay
        with ContextExecutor() as executor:
            futures = [
                executor.submit(device.send_message, body, title=title, extra={
                                **payload, 'targets': device.targets}, **options)
                for device in notification_devices
            ]
            notification_responses = [future.result()
                                      for future in as_completed(futures)]

            data_payload = payload.copy()
            data_payload['caption'] = title or ''
            data_payload['description'] = body or ''

            futures = [
                executor.submit(device.send_message, None, title=None, extra={**data_payload, 'targets': device.targets}, **options)
                for device in data_devices
            ]
            data_responses = [future.result()
                              for future in as_completed(futures)]

            # SNS
            sns_client = get_sns_client()
            retry_device_ids = []

            futures = []
            for device in sns_devices:
                sns_messages = generate_provider_specific_messages(
                    title=title, body=body, options=options,
                    payload={**payload, 'targets': device.targets},
                    data_payload={**data_payload, 'targets': device.targets}
                )
                futures.append(executor.submit(
                    send_sns_push, device, sns_client, sns_messages, retry_device_ids, self))
            wait(futures)

        return (notification_responses, data_responses), retry_device_ids


def validate_emails(targets):
    for target in targets:
        validate_email(target)


def validate_system_id(system_id, version=4):
    try:
        if system_id:
            UUID(system_id, version=version)
    except ValueError:
        raise ValidationError('Not a valid system id', code='invalid')


def validate_attachments(attachments):
    '''TODO: Add more refined validation
    '''
    required_fields = ('filename', 'content', 'mimetype')

    if not attachments:
        return

    if not isinstance(attachments, list):
        raise ValidationError(
            'Invalid attachments: Must be a list of dicts', code='invalid')

    for attachment in attachments:
        if not isinstance(attachment, dict):
            raise ValidationError(
                'Invalid attachments: Must be a list of dicts', code='invalid')

        for field in required_fields:
            if not attachment.get(field, None):
                raise ValidationError(
                    f'Invalid attachments: {field} missing', code='invalid')

        # TODO: Maybe validate content is b64


RESULT_STATES = Choices(('open', 'Open'),
                        ('in_progress', 'In Progress'),
                        ('success', 'Success'),
                        ('failure', 'Failure'))


URL_REGEX = r"(?i)\b(([\S])*([a-z0-9\-]+\.)*[a-z0-9\-]{2,63}\.[a-z]{2,})"

FLOAT_OR_VERSION_REGEX = r"^[\d\.]+[\d]+$"

EMAIL_REGEX = r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}"

def check_urls(known_urls, sub_val='{redacted_url}'):
    relay = settings.TRAFFIC_RELAY_HOST.replace('{systemId}.', '')
    def _check_urls(match_obj):
        original = match_obj.group()
        domain = original.split('//')[-1].split('/')[0]
        parent_domain = '.'.join(domain.split('.')[-2:])
        known_domains = [known_url.split('/')[0] for known_url in known_urls]
        matched = domain.startswith('src="cid:') or any(domain in known_domains for domain in [parent_domain, domain])
        is_email = re.fullmatch(EMAIL_REGEX, original)
        is_relay = relay in original
        return original if matched or is_email or is_relay else original.replace(domain, sub_val)

    return _check_urls


def clean_content_factory(known_urls=None, customization=None):
    from cms.forms import get_branding_shortcuts
    _branding, hidden_branding = get_branding_shortcuts(customization=customization)
    known_urls = [url] if isinstance(url := known_urls or [], str) else url
    known_urls += [val.split('//')[-1] for _, val in _branding + hidden_branding if val and re.search(URL_REGEX, val)]

    def _clean_content(to_clean):
        return re.sub(URL_REGEX, check_urls(known_urls), to_clean)

    return _clean_content


def sub_system_id_factory(**kwargs):
    proxy = settings.TRAFFIC_RELAY_HOST.replace('{systemId}', '')
    system_link_regex = r"(?<=://)([0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12})" + f'(?!{proxy})'

    def replace_proxy(match):
        system_id, = match.groups()
        return system_id + proxy


    def _sub_system_id(content):
        return re.sub(system_link_regex, replace_proxy, content)

    return _sub_system_id

def wrap_text(message):
    if re.search('  ', message):
        return f'<pre style="font-family: monaco, monospace;">{message}</pre>'
    return ''.join(f'<p>{paragraph}</p>' for paragraph in message.split('\n'))


class SystemEmail(models.Model):
    MSG_TYPE = 'system_notification'

    customization = models.CharField(max_length=255, default='default')

    # Email content
    system_id = models.TextField(blank=True, validators=[validate_system_id])
    targets = JSONField(blank=False, validators=[validate_emails])
    subject = models.TextField(blank=False)
    message_html = models.TextField(blank=True)
    message_text = models.TextField(blank=True)
    attachments = JSONField(blank=True, validators=[validate_attachments])
    cloud_wrapper = models.BooleanField(default=False)

    # Email state
    created_date = models.DateTimeField(auto_now_add=True)
    completed_date = models.DateTimeField(null=True, blank=True)
    result = models.TextField(choices=RESULT_STATES,
                              default=RESULT_STATES.open)

    @property
    def message(self):
        return {
            'html_body': self.message_html,
            'text_body': self.message_text
        }

    def clean_email(self):
        def clean(content):
            content_cleaners = [clean_content_factory, sub_system_id_factory]

            for cleaner in content_cleaners:
                content = cleaner(customization=self.customization)(content)

            return content

        self.subject = clean(self.subject)
        self.message_html = clean(self.message_html or wrap_text(self.message_text))
        self.message_text = clean(self.message_text or html2text(self.message_html))

    def auto_test_guard(self):
        # Skips noptixautoqa emails unless they have sendemail in the alias
        if any('noptixautoqa' in email and not NOPTIXQA_SENDEMAILS_PATTERN.match(email) for email in self.targets):
            self.send_date = timezone.now()
            self.save()
            return True

    def save(self, *args, **kwargs):
        cache_key = str(uuid4())
        if self.attachments:
            caches['emails'].set(cache_key, self.attachments)
            self.attachments = {'cache_key': cache_key}
        else:
            self.attachments = {}
        super().save(*args, **kwargs)

    def send(self, session):
        self.clean_email()

        if self.auto_test_guard():
            return

        from notifications.tasks import send_email
        kwargs = {'email_type': SystemEmail.MSG_TYPE, 'session': session}
        self.save()

        if settings.USE_ASYNC_QUEUE and USE_SQS_FOR_CLOUD_NOTIFICATIONS:
            queue = settings.NOTIFICATIONS_CONFIG[SystemEmail.MSG_TYPE].get('queue', '')
            kwargs['queue'] = queue
            send_email.apply_async(
                args=[self.id], queue=queue, kwargs=kwargs)
        else:
            send_email(self.id, **kwargs)
