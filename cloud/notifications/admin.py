from django.apps import apps
from django.conf import settings
from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html
from django_celery_results.models import TaskResult
import json
import pystache
import pytz
import re
from push_notifications.admin import GCMDeviceAdmin

# Register your models here.
from notifications.conf import CLOUD_NOTIFICATIONS_USERS_TEMPLATE
from notifications.models import *
from notifications.forms import *
admin.site.unregister(TaskResult)

# Unregister unused push_notifications model admins
app = apps.get_app_config('push_notifications')
for model_name, model in app.models.items():
    admin.site.unregister(model)


class NotificationAdmin(admin.ModelAdmin):
    def has_add_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Subscription)
class SubscriptionAdmin(NotificationAdmin):
    list_display = ('id', 'object', 'type', 'user_email', 'created_date', 'enabled')


@admin.register(Message)
class MessageAdmin(NotificationAdmin):
    list_display = ('type', 'user_email', 'created_date', 'send_date', 'delivery_time_interval', 'task_id')
    readonly_fields = ('user_email', 'external_id', 'task_id', 'type', 'customization',
                       'message', 'created_date', 'send_date', 'delivery_time_interval', 'event')
    list_filter = ('type', 'created_date', 'send_date')
    search_fields = ('user_email', 'created_date', 'send_date', 'message')
    actions = ['clean_old_messages']

    def clean_old_messages(self, request, queryset):
        from datetime import datetime, timedelta
        cutoff_date = datetime.now() - timedelta(days=settings.CLEAR_HISTORY_RECORDS_OLDER_THAN_X_DAYS)
        Message.objects.filter(send_date__lt=cutoff_date).delete()

    clean_old_messages.short_description = f"Remove messages older than {settings.CLEAR_HISTORY_RECORDS_OLDER_THAN_X_DAYS} days"


@admin.register(Event)
class EventAdmin(NotificationAdmin):
    list_display = ('type', 'object', 'created_date', 'send_date', 'data')
    list_filter = ('type', 'object', 'created_date')


@admin.register(Feedback)
class FeedbackAdmin(NotificationAdmin):
    list_display = ('asset_name', 'target_asset', 'type', 'sender_name', 'sender_email',
                    'created_date')
    list_filter = ('type', 'created_date')
    list_display_links = ('target_asset',)
    readonly_fields = ('message',)
    search_fields = ('asset_name', 'sender_name', 'sender_email')

    def get_readonly_fields(self, request, obj=None):
        return self.list_display + self.readonly_fields


@admin.register(CloudNotification)
class CloudNotificationAdmin(admin.ModelAdmin):
    list_display = ("subject", "body", "sent_by", "convert_date")
    change_form_template = "notifications/cloud_notifications_change_form.html"
    readonly_fields = ("sent_by", "convert_date", "user_customizations_list", "emails_with_subject")
    form = CloudNotificationAdminForm
    fieldsets = [
        ("Subject and Body for email", {
            "fields": ("subject", "body"),
            "description": "<div>Body should be formated in html</div>"
        }),
        ("Test users", {"fields": ("test_users", "emails_with_subject")}),
        ("When and who sent the notification", {"fields": (("sent_by", "convert_date"))}),
        ("Target Customizations", {"fields": ("customizations",)}),
        ("Recipients of the email by customization", {"fields": ("user_customizations_list", )})
    ]

    def get_form(self, request, obj=None, **kwargs):
        ModelForm = super(CloudNotificationAdmin, self).get_form(request, obj, **kwargs)

        class ModelFormMetaClass(ModelForm):
            def __new__(cls, *args, **kwargs):
                kwargs['user'] = request.user
                return ModelForm(*args, **kwargs)

        return ModelFormMetaClass

    def add_view(self, request, form_url='', extra_context=None):
        extra_context = extra_context or {}
        extra_context['BROADCAST_NOTIFICATIONS_SUPERUSERS_ONLY'] = settings.BROADCAST_NOTIFICATIONS_SUPERUSERS_ONLY
        return super(CloudNotificationAdmin, self).add_view(
            request, form_url, extra_context=extra_context,
        )

    def change_view(self, request, object_id, form_url='', extra_context=None):
        extra_context = extra_context or {}
        extra_context['BROADCAST_NOTIFICATIONS_SUPERUSERS_ONLY'] = settings.BROADCAST_NOTIFICATIONS_SUPERUSERS_ONLY
        return super(CloudNotificationAdmin, self).change_view(
            request, object_id, form_url, extra_context=extra_context,
        )

    def convert_date(self, obj):
        if obj.sent_date and 'timezone' in self.request.session and self.request.session['timezone']:
            user_timezone = self.request.session['timezone']
            utc = pytz.utc.localize(obj.sent_date)
            converted_time = utc.astimezone(pytz.timezone(user_timezone))\
                                .replace(tzinfo=None).strftime("%b. %d, %Y, %H:%M")
            return format_html(f'<span title="{timezone}">{converted_time}</span>')
        return obj.sent_date
    convert_date.short_description = "Sent date"
    convert_date.allow_tags = True
    convert_date.admin_order_field = "sent_date"

    def has_delete_permission(self, request, obj=None):
        self.request = request
        if obj and obj.sent_date:
            return False
        return super(CloudNotificationAdmin, self).has_delete_permission(request, obj=obj)

    def get_readonly_fields(self, request, obj=None):
        if obj and obj.sent_date:
            return self.readonly_fields + ('subject', 'body', 'customizations')
        return self.readonly_fields

    def emails_with_subject(self, obj=None):
        return format_html(
            f"<a class=\"btn btn-sm btn-primary\" style=\"color: white;\""
            f"href=\"{reverse('admin:notifications_message_changelist')}?q={obj.subject or ''}\""
            f"target=\"_blank\">Goto messages</a>"
        )

    emails_with_subject.short_description = "Check messages with subject"

    def user_customizations_list(self, obj=None):
        if obj and obj.customizations.exists():
            customizations = list(obj.customizations.values_list("name", flat=True))
            users_by_customization = []
            for customization in customizations:
                users_by_customization.append({
                    "name": customization,
                    "users": ", ".join(list(Account.objects.filter(customization=customization)
                                       .values_list("email", flat=True))).replace("{", "&#123;").replace("}", "&#125;")
                })
            return format_html(pystache.render(CLOUD_NOTIFICATIONS_USERS_TEMPLATE,
                                               {"users_by_customization": users_by_customization}))
        return "No customizations"
    user_customizations_list.short_description = "Recipients by customization"


@admin.register(TaskResult)
class TaskResultAdmin(NotificationAdmin):
    list_display = ('task_id', 'date_done', 'status')
    readonly_fields = ('date_done', 'result', 'meta')
    list_filter = ('date_done', 'status')
    search_fields = ('date_done', 'meta', 'result', 'task_id')
    actions = ['clean_old_tasks']
    fieldsets = (
        (None, {
            'fields': (
                'task_id',
                'status',
                'content_type',
                'content_encoding',
            ),
            'classes': ('extrapretty', 'wide')
        }),
        ('Result', {
            'fields': (
                'result',
                'date_done',
                'traceback',
                'meta',
            ),
            'classes': ('extrapretty', 'wide')
        }),
    )

    class Meta:
        proxy = True

    def get_readonly_fields(self, request, obj=None):
        if request.user.is_superuser:
            return list(self.readonly_fields)
        return list(set(list(self.readonly_fields) +
                        [field.name for field in obj._meta.fields] +
                        [field.name for field in obj._meta.many_to_many]))


    def clean_old_tasks(self, request, queryset):
        from datetime import datetime, timedelta
        cutoff_date = datetime.now() - timedelta(days=settings.CLEAR_HISTORY_RECORDS_OLDER_THAN_X_DAYS)
        TaskResult.objects.filter(date_done__lt=cutoff_date).delete()

    clean_old_tasks.short_description = f"Remove tasks older than {settings.CLEAR_HISTORY_RECORDS_OLDER_THAN_X_DAYS} days"


@admin.register(PushSubscription)
class PushSubscriptionAdmin(admin.ModelAdmin):
    form = PushSubscriptionForm
    list_display = ('system_id',)


@admin.register(PushNotification)
class PushNotificationAdmin(admin.ModelAdmin):
    search_fields = ('title', 'body', 'raw_system_id', 'raw_targets', 'devices__user__email', 'result_data')
    list_filter = ('customization', 'state')
    list_display = ('short_title', 'customization', 'state', 'raw_targets_formatted', 'raw_system_id',
                    'created_date_formatted', 'send_date_formatted', 'delivery_interval', 'result_errors')
    readonly_fields = ('log',)

    def raw_targets_formatted(self, obj):
        if len(obj.raw_targets) > 80:
            return obj.raw_targets[:77] + '...'
        return obj.raw_targets
    raw_targets_formatted.short_description = 'Raw Targets'

    def created_date_formatted(self, obj):
        return obj.created_date.strftime('%B %d, %Y %H:%M:%S') if obj.created_date else ''
    created_date_formatted.short_description = 'Created Date'

    def send_date_formatted(self, obj):
        return obj.send_date.strftime('%B %d, %Y %H:%M:%S') if obj.send_date else ''
    send_date_formatted.short_description = 'Send Date'

    def delivery_interval(self, obj):
        if obj.send_date and obj.created_date:
            return (obj.send_date - obj.created_date).total_seconds()
        return None
    delivery_interval.short_description = 'Delivery Time Interval'

    def short_title(self, obj):
        return obj.title if len(obj.title) < 50 else f'{obj.title[:47]}...'
    short_title.short_description = 'Title'

    def result_errors(self, obj):
        result = obj.result_data
        if result:
            error = re.search(r'[^"\']{0,30}([Ee]rror|[Ww]arning|Exception)[^"]{0,100}', result)
            if error:
                return f'{error.group(0)}...'
        return ''

    def log(self, obj):
        result = obj.result_data
        if result:
            result = json.loads(result)
            return format_html(result.get('log', '').replace('\n', '<br>'))
        return ''

    def get_readonly_fields(self, request, obj=None):
        return list(set(
            [field.name for field in self.opts.local_fields] +
            [field.name for field in self.opts.local_many_to_many]
        )) + list(self.readonly_fields)


@admin.register(PushDevice)
class PushDeviceAdmin(GCMDeviceAdmin):
    list_display = ('name', 'user', 'active', 'date_created', 'provider')

    def get_readonly_fields(self, request, obj=None):
        return list(set(
            [field.name for field in self.opts.local_fields] +
            [field.name for field in self.opts.local_many_to_many]
        ))
