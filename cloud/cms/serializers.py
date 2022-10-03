from json.decoder import JSONDecodeError
from django.conf import settings
from django.core import validators, exceptions
from rest_framework import serializers, fields
from cms.controllers.modify_db import save_unrevisioned_records

from cms.models import Asset, Context, DataStructure, AssetType, CustomClient, Customization, OpenAPIJSON, get_vms_asset
import re


class BaseCMSSerializer(serializers.ModelSerializer):
    def __init__(self, *args, **kwargs):
        self.query = {"use_actual_values": False}
        if "use_actual_values" in kwargs:
            self.query["use_actual_values"] = kwargs.pop("use_actual_values")

        if "asset" in kwargs:
            self.query["asset"] = kwargs.pop("asset")
        if "lang" in kwargs:
            self.query["lang"] = kwargs.pop("lang")
        if "draft" in kwargs:
            self.query["draft"] = kwargs.pop("draft")

        if "params" in kwargs:
            self.query.update(kwargs.pop("params"))

        if not self.query["use_actual_values"]:
            self.query = {}

        super().__init__(*args, **kwargs)


class DataStructureSerializer(BaseCMSSerializer):
    class Meta:
        model = DataStructure
        fields = ("label", "name", "value", "description", "type", "advanced", "optional", "public", "protected",
                  "meta")

    value = serializers.SerializerMethodField('get_value_for_datastructure')
    meta = serializers.JSONField(source="meta_settings")
    type = serializers.SerializerMethodField("get_nice_name")

    def get_value_for_datastructure(self, obj):
        is_file_or_image = DataStructure.is_file_or_image(obj.type)
        if self.query and not is_file_or_image:

            return obj.find_actual_value(asset=self.query["asset"],
                                         language=self.query["lang"],
                                         draft=self.query["draft"])
        return obj.default if not is_file_or_image else ""

    def get_nice_name(self, obj):
        return DataStructure.DATA_TYPES[obj.type]


class ContextSerializer(BaseCMSSerializer):
    class Meta:
        model = Context
        fields = ("name", "label", "file_path", "description",
                  "url", "translatable", "values")

    values = serializers.SerializerMethodField('get_datastructure_values')

    def get_datastructure_values(self, obj):
        return DataStructureSerializer(obj.datastructure_set.all(), many=True, params=self.query).data


class AssetTypeSerializer(BaseCMSSerializer):
    class Meta:
        model = AssetType
        fields = ("type", "can_preview", "single_customization", "contexts")

    contexts = serializers.SerializerMethodField('get_contexts_values')
    type = serializers.SerializerMethodField("get_nice_name")

    def get_contexts_values(self, obj):
        return ContextSerializer(obj.context_set.all(), many=True, params=self.query).data

    def get_nice_name(self, obj):
        return AssetType.ASSET_TYPES[obj.type]


# Documentation Serializers

class DocumentationBlock(serializers.Serializer):
    title = serializers.CharField(label='Title', allow_blank=True)
    contentHTML = serializers.CharField(
        label='HTML Content',  allow_blank=True)
    content = serializers.CharField(label='Content', allow_blank=True)


class DocumentationPageSerializer(serializers.Serializer):
    title = serializers.CharField(label='Title')
    shortDescription = serializers.CharField(
        label='Short Description', allow_blank=True)
    blocks = DocumentationBlock(many=True)
    script = serializers.CharField(label='Script', allow_blank=True)
    id = serializers.CharField(label='Id')
    reviewId = serializers.IntegerField(required=False)


class DocumentsSerializer(serializers.Serializer):
    docs = DocumentationPageSerializer(many=True)
    page = serializers.IntegerField(label='Page number'),
    pageSize = serializers.IntegerField(label='Max number of docs per page'),
    totalPages = serializers.IntegerField(label='Total number of pages'),
    totalResults = serializers.IntegerField(
        label='Total number documents for search')


class MenuSerializer(serializers.Serializer):
    name = serializers.CharField(label='Name')
    url = serializers.CharField(label='URL')
    asset_id = serializers.IntegerField(allow_null=True, required=False)
    asset_type = serializers.CharField(allow_blank=True, required=False)
    related_asset_ids = serializers.ListField(child=serializers.IntegerField())
    next_item = serializers.BooleanField(),
    new_window = serializers.BooleanField(),
    icon = serializers.CharField(allow_blank=True)
    authentication = serializers.CharField()
    order = serializers.IntegerField()
    display_name = serializers.CharField()
    asset = serializers.JSONField(label='Asset Data')
    assetKB = serializers.CharField(label='Asset Knowledebase Name')
    pending = serializers.BooleanField()
    draft = serializers.BooleanField()


class ArticleSerializer(serializers.Serializer):
    title = serializers.CharField()
    body = serializers.CharField(allow_blank=True)


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
            custom_fields = AssetType.get_custom_fields_by_type(
                AssetType.ASSET_TYPES.vms)

            self.custom_fields = {
                key: value for key, value in custom_fields.items()
                if custom_fields[key].get('source', '') == 'custom' and not (
                    custom_fields[key].get('metaOnly', False) and not settings.META)
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
        if not settings.META or not self.context.get('request', None):
            self.fields['base_vms'].read_only = True
        else:
            self.fields['base_vms'].queryset = self.context['request'].user.custom_client_vms_assets
            self.fields['base_vms'].required = False
            self.fields['base_vms'].default = get_vms_asset()


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


class SanitizeHTMLSerializer(serializers.Serializer):
    html = serializers.CharField()


class OpenAPIJSONSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source='get_type_display')
    content = serializers.JSONField()

    class Meta:
        model = OpenAPIJSON
        fields = ('__all__')


class AssetDataRecordSerializer(serializers.Serializer):
    def __init__(self, *args, **kwargs):
        self.asset = kwargs.pop('asset', None)
        super().__init__(*args, **kwargs)

    def to_representation(self, instance):
        self._instance = instance
        ds = DataStructure.objects.get(id=instance)
        return ds.find_actual_value(
            self.asset, draft=True, customization_name=settings.CUSTOMIZATION)


class AssetDsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataStructure
        read_only_fields = 'id', 'name'
        fields = 'id', 'name'

    def __init__(self, *args, **kwargs):
        self.asset = kwargs.pop('asset', None)
        super().__init__(*args, **kwargs)
        self.fields['value'] = AssetDataRecordSerializer(
            source='id', asset=self.asset)

    def to_representation(self, instance):
        self._instance = instance
        return super().to_representation(instance)


class AssetContextSerializer(serializers.ModelSerializer):
    class Meta:
        model = Context
        fields = 'id', 'name'
        read_only_fields = 'id', 'name'

    def __init__(self, *args, **kwargs):
        self.asset = kwargs.pop('asset', None)
        super().__init__(*args, **kwargs)
        self.fields['values'] = AssetDsSerializer(
            source='datastructure_set', many=True, asset=self.asset)


class AssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        exclude = 'preview_status', 'protected', 'created_by', 'primary_group', 'asset_type'

    assetType = serializers.PrimaryKeyRelatedField(
        required=True, queryset=AssetType.objects.all(), source='asset_type')

    state = serializers.SerializerMethodField('get_state')

    context_errors = None

    def handle_ds_value_validation(self, ds, value, context_errors):
        if ds and (errors := ds.validate_value(value)):
            context_errors[ds.name] = errors

    def validate(self, data):
        validated = super().validate(data)
        self.process_contexts(self.initial_data)

        return validated

    def process_contexts(self, data):
        qs = DataStructure.objects.all()
        context_errors = {}
        for context_dict in data.get('contexts', []):
            # context_id = context_dict.get('id', None)
            datastructures = context_dict.get('values', [])
            for ds_dict in datastructures:
                ds_id = ds_dict.get('id', None)
                value = ds_dict.get('value', None)
                ds = qs.filter(id=ds_id).first()
                self.handle_ds_value_validation(ds, value, context_errors)

        if context_errors:
            self.context_errors = context_errors
            # raise serializers.ValidationError({'contexts': context_errors})

    def get_state(self, obj):
        version = obj.contentversion_set.last()
        return 'draft' if obj.is_dirty or not version else version.state

    def run_validation(self, *args, **kwargs):
        validated_data = super().run_validation(*args, **kwargs)
        asset_id = args[0].pop('id', None)
        values = {
            context['id']: {
                ds['name']: ds['value']
                for ds in context.get('values', [])
            }
            for context in args[0].pop('contexts', [])

        }
        return {
            **validated_data,
            'values': values,
            'assetId': asset_id
        }

    def create(self, validated_data):
        request, values, asset_id = self.get_values(validated_data)
        asset = self.update(Asset.objects.get(id=asset_id),
                            validated_data) if asset_id else super().create(validated_data)

        self.update_records(request, values, asset)

        return asset

    def update_records(self, request, values, asset):
        from cms.views.asset import save_records

        for context_id, datarecords in values.items():
            context = Context.objects.get(id=context_id)
            save_records(None, datarecords, False, asset,
                         context, request._files, request)

    def get_values(self, validated_data):
        request = self.context.get("request")
        values = validated_data.pop('values', [])
        asset_id = validated_data.pop('assetId', None)
        return request, values, asset_id

    def add_context_validation_messages(self, data):
        if self.context_errors is None:
            self.process_contexts(data)

        if self.context_errors:
            for context in data.get('contexts', []):
                for ds in context.get('values', []):
                    ds['errors'] = next(
                        (
                            errors for context_name, errors in self.context_errors.items()
                            if context_name == ds.get('name', None)
                        ),
                        []
                    )

    def to_representation(self, instance):
        if isinstance(self.instance, Asset):
            self.fields['contexts'] = AssetContextSerializer(
                source='asset_type.context_set', many=True, asset=self.instance)

        rep = super().to_representation(instance)

        self.add_context_validation_messages(rep)

        return rep
