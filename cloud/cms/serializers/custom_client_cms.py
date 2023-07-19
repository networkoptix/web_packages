"""
Serializers for Custom Client CMS on the frontend.
"""

import re
from django.conf import settings
from django.core import validators, exceptions
from rest_framework import serializers, fields

from cloud.customization_context import is_metavms
from cms.models import AssetType, CustomClient, Customization, get_vms_asset


class EmailOrUrlValidator:
    def __init__(self, message=None):
        if message is not None:
            self.message = message

    def __call__(self, value):
        self.validators = validators.EmailValidator(), validators.URLValidator()
        for validator in self.validators:
            try:
                validator(value)
            except exceptions.ValidationError:
                pass
            else:
                return

        raise exceptions.ValidationError(self.message, code='invalid')


class EmailOrUrlField(fields.CharField):
    default_error_messages = {
        'invalid': 'Enter a valid url or email address.'
    }

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        validator = EmailOrUrlValidator(message=self.error_messages['invalid'])
        self.validators.append(validator)


REGEX_FIELD_MAP = {
    'emailField': serializers.EmailField,
    'urlField': serializers.URLField,
    'emailOrUrlField': EmailOrUrlField
}


class CustomClientSerializer(serializers.ModelSerializer):

    class ValuesSerializer(serializers.Serializer):
        cloud_host_regex = re.compile(
            r'(?:https?://)?([\da-z.~_-]+\.[a-z.]{2,6})*')

        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            custom_fields = {} if settings.MIGRATING else AssetType.get_custom_fields_by_type(AssetType.ASSET_TYPES.vms)

            self.custom_fields = {
                key: value for key, value in custom_fields.items()
                if custom_fields[key].get('source', '') == 'custom' and not (
                    custom_fields[key].get('metaOnly', False) and not is_metavms(self.context.get('request', None)))
            }
            for field_name, field_props in self.custom_fields.items():
                optional = field_props.get('optional', False)
                regex = field_props.get('regex', '')
                field_kwargs = dict(required=not optional, allow_blank=optional,
                                    label=field_props.get('label', field_name))
                if regex:
                    if regex in REGEX_FIELD_MAP:
                        field = REGEX_FIELD_MAP[regex](**field_kwargs)
                    else:
                        field = serializers.RegexField(
                            regex=regex, **field_kwargs)
                else:
                    field = serializers.CharField(**field_kwargs)

                self.fields[field_name] = field
                # Needed to handle "." in variable names being split
                self.fields[field_name].source_attrs = [field_name]

        def validate_portalUrl(self, value):
            match = self.cloud_host_regex.search(value)
            if not match or not Customization.objects.filter(host=match.group(1)).exists():
                raise serializers.ValidationError('Portal URL not valid')
            return match.group(1)

        def validate(self, data):
            increment_eula = False
            eula_version = 1
            if self.parent and self.parent.instance:
                for key in self.custom_fields:
                    if key not in data:
                        data[key] = self.parent.instance.values.get(key, '')
                    elif key in ['%eulaTitle%', '%eulaContent%'] and data[key] != self.parent.instance.values.get(key, ''):
                        increment_eula = True

                if increment_eula:
                    eula_version = self.parent.instance.values.get(
                        '%eulaVersion%', 0) + 1
                else:
                    eula_version = self.parent.instance.values.get(
                        '%eulaVersion%', 1)

            data['%eulaVersion%'] = eula_version
            return data

        def to_representation(self, instance):
            return instance

    created_by = serializers.SlugRelatedField(
        slug_field='email', read_only=True)
    values = ValuesSerializer(required=False, partial=True)

    class Meta:
        model = CustomClient
        exclude = ['created_customization']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.request = kwargs.get('request', None)
        if getattr(self.context.get('view', None), 'swagger_fake_view', False):
            # initialize serializer for swagger inspection
            return
        if not is_metavms(self.context.get('request', None)) or not self.context.get('request', None)\
                or not self.context['request'].user.is_authenticated:
            self.fields['base_vms'].read_only = True
        else:
            self.fields['base_vms'].queryset = self.context['request'].user.custom_client_vms_assets(request=self.request)
            self.fields['base_vms'].required = False
            self.fields['base_vms'].default = get_vms_asset(request=self.request)


class FieldeManifestSerialzier(serializers.Serializer):
    name = serializers.CharField()
    label = serializers.CharField()
    type = serializers.CharField()
    metaOnly = serializers.BooleanField()
    description = serializers.CharField()
    optional = serializers.BooleanField()


class ContextManifestSerializer(serializers.Serializer):
    fields = FieldeManifestSerialzier(many=True)


class ContentManifestSerializer(serializers.Serializer):
    contexts = ContextManifestSerializer(many=True)


class GenerateCustomClientSerializer(serializers.Serializer):
    downloadId = serializers.UUIDField(read_only=True)


class CheckPackageCustomClientSerializer(serializers.Serializer):
    state = serializers.CharField(read_only=True)
    message = serializers.CharField(read_only=True, required=False)
    errors = serializers.CharField(read_only=True, required=False)
    current = serializers.CharField(read_only=True, required=False)
    total = serializers.CharField(read_only=True, required=False)

    def to_representation(self, instance):
        from cms.tasks import TaskErrors

        if instance.ready():
            if instance.successful():
                return {'state': 'ready'}
            else:
                if type(instance.result) == TaskErrors:
                    return {'state': 'failed', 'message': 'Failed to generate package', 'errors': instance.result.errors}
                else:
                    return {'state': 'failed', 'message': 'Unknown error occured while generating package'}
        elif instance.result:
            current = instance.result.get('current', 0)
            total = instance.result.get('total', 0)
            return {'state': 'pending', 'current': current, 'total': total}
        else:
            return {'state': 'pending', 'current': None, 'total': None}


class PackageDownloadIdSerializer(serializers.Serializer):
    downloadId = serializers.UUIDField()
