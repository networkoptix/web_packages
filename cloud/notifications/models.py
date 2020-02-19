import json
import re
from django.db import models
from django.utils import timezone
from jsonfield import JSONField
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxLengthValidator
from django.db.models import Q
from model_utils import Choices
from push_notifications.gcm import FCM_NOTIFICATIONS_PAYLOAD_KEYS, FCM_OPTIONS_KEYS
from push_notifications.models import GCMDevice
from rest_framework import serializers
from cms.models import Customization, Asset, DataStructure
from api.models import Account

# Monkey patch to add extra keys to be used in the "notification" object in the request to fcm
FCM_NOTIFICATIONS_PAYLOAD_KEYS.extend(['image', 'apns', 'subtitle'])
FCM_OPTIONS_KEYS.append('mutable_content')

# When cloudportal is ran locally it uses amqp by default. BROKER_TRANSPORT_OPTIONS is related to sqs.
# This allows cloud notifications to run locally without changing settings to use sqs.
USE_SQS_FOR_CLOUD_NOTIFICATIONS = hasattr(settings, "BROKER_TRANSPORT_OPTIONS")

RELAY_GUID_PATTERN = re.compile('([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(/)')


class MessageTypes(object):
    contact_sales = "contact_sales"
    contact_support = "contact_support"
    integration_feedback = "integration_feedback"
    ipvd_feedback_page = "ipvd_feedback_page"
    ipvd_feedback_device = "ipvd_feedback_device"
    ipvd_feedback = "ipvd_feedback"


class Event(models.Model):
    object = models.CharField(max_length=255)
    type = models.CharField(max_length=255)
    data = JSONField()
    created_date = models.DateTimeField(auto_now_add=True)
    send_date = models.DateTimeField(null=True, blank=True)

    def send(self):
        self.save()
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
            user = Account.objects.filter(email=subscription.user_email).first()

            if user:
                self.data['userFullName'] = user.get_full_name()

            message = Message(
                message=self.data,
                user_email=subscription.user_email,
                customization=user.customization if user else settings.CUSTOMIZATION,
                type=self.type,
                event=self
            )
            message.send()
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


class Message(models.Model):
    user_email = models.CharField(max_length=255)
    external_id = models.CharField(max_length=64, db_index=True, unique=True, blank=True, null=True)
    task_id = models.CharField(max_length=50, blank=True, editable=False)
    type = models.CharField(max_length=255)
    customization = models.CharField(max_length=255, default='default')
    message = JSONField()
    created_date = models.DateTimeField(auto_now_add=True)
    send_date = models.DateTimeField(null=True, blank=True)
    event = models.ForeignKey(Event, null=True, on_delete=models.CASCADE)

    REQUIRED_FIELDS = ['user_email', 'type', 'message']

    def send(self):
        self.save()

        # TODO: initiate business-logic here
        from .tasks import send_email

        if settings.USE_ASYNC_QUEUE and USE_SQS_FOR_CLOUD_NOTIFICATIONS:
            queue_name = ""
            if 'queue' in settings.NOTIFICATIONS_CONFIG[self.type]:
                queue_name = settings.NOTIFICATIONS_CONFIG[self.type]['queue']

            result = send_email.apply_async(args=[self.id, queue_name], queue=queue_name)
            self.task_id = result.task_id
        else:
            send_email(self.id)
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

    def send(self):
        self.save()
        data = {
            'sender_name': self.sender_name,
            'sender_email': self.sender_email,
            'asset': self.asset_name,
            'message': self.message
        }
        event = Event.objects.create(type=self.type, object=self.target_asset.id, data=data)
        event.send()

        # Send email to the contact email for an integration.
        data_structure = DataStructure.objects.filter(
            name='supportEmail', context__asset_type=self.target_asset.asset_type,
            context__name__in=['support', 'Settings']
        ).last()
        contact_email = data_structure.find_actual_value(
            asset=self.target_asset, version_id=self.target_asset.version_id()
        )
        emails = [self.sender_email]
        if contact_email:
            emails.append(contact_email)

        msg = Message.objects.create(user_email=json.dumps(emails),
                                     type=self.type,
                                     customization=settings.CUSTOMIZATION,
                                     message=data,
                                     event=event)
        msg.send()


class MessageStatusSerializer(serializers.ModelSerializer):  # model to use when checking on message status
    class Meta:
        model = Message
        fields = ('external_id', 'task_id', 'type', 'customization', 'created_date', 'send')


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


class PushDevice(GCMDevice):
    OS = Choices((0, 'web', 'Web'),
                 (1, 'android', 'Android'),
                 (2, 'ios', 'iOS'))
    TYPES = Choices((0, 'notification', 'notification'),
                    (1, 'data', 'data'))
    model = models.CharField(max_length=255)
    subscriptions = models.ManyToManyField(PushSubscription)
    os = models.IntegerField(choices=OS, default=OS.web)
    type = models.IntegerField(choices=TYPES, default=TYPES.notification)


class PushNotification(models.Model):
    SIZE_LIMIT = 4000

    title = models.CharField(max_length=255, blank=True)
    body = models.TextField(max_length=SIZE_LIMIT, validators=[MaxLengthValidator(SIZE_LIMIT)], blank=True)
    payload = models.TextField(
        max_length=SIZE_LIMIT, blank=True, null=True, validators=[MaxLengthValidator(SIZE_LIMIT)]
    )
    options = models.TextField(blank=True, null=True)
    devices = models.ManyToManyField(PushDevice)

    raw_system_id = models.CharField(max_length=255, default='')
    raw_targets = models.TextField(null=True)
    result_data = models.TextField(null=True, blank=True)
    customization = models.ForeignKey(Customization, blank=True, null=True, on_delete=models.SET_NULL)

    def clean(self):
        if len(self.title + self.body + self.payload) > self.SIZE_LIMIT:
            raise ValidationError(f'Title, body, and payload cannot total more than {self.SIZE_LIMIT}')
        super(PushNotification, self).clean()

    def save(self, *args, **kwargs):
        self.full_clean()
        super(PushNotification, self).save(*args, **kwargs)

    def sub_traffic_relay(self, url):
        match = RELAY_GUID_PATTERN.search(url)
        if match:
            system_id = match.groups()[0]
            relay_host = settings.TRAFFIC_RELAY_HOST.replace('{systemId}', system_id)
            url = url.replace(system_id, relay_host)
        return url

    def send_notifications(self, device_tokens=None):
        if device_tokens:
            devices = PushDevice.objects.filter(registration_id__in=device_tokens)
        else:
            devices = self.devices.all()

        title = self.title or None
        body = self.body or None
        payload = json.loads(self.payload) if self.payload else {}
        if payload['imageUrl']:
            payload['imageUrl'] = self.sub_traffic_relay(payload['imageUrl'])
        payload['systemId'] = self.raw_system_id
        payload['targets'] = self.raw_targets
        options = json.loads(self.options) if self.options else {}

        notification_devices = devices.filter(type=PushDevice.TYPES.notification)
        data_devices = devices.filter(type=PushDevice.TYPES.data)

        notification_response = notification_devices.send_message(body, title=title, extra=payload, **options)
        payload['caption'] = title or ''
        payload['description'] = body or ''
        data_response = data_devices.send_message(None, title=None, extra=payload, **options)

        return notification_response, data_response
