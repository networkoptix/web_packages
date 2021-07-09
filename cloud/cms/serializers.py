from django.conf import settings
from rest_framework import serializers

from cms.models import Context, DataStructure, AssetType, CustomClient


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
        fields = ("name", "label", "file_path", "description", "url", "translatable", "values")

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
    contentHTML = serializers.CharField(label='HTML Content',  allow_blank=True)
    content = serializers.CharField(label='Content', allow_blank=True)


class DocumentationPageSerializer(serializers.Serializer):
    title = serializers.CharField(label='Title')
    shortDescription = serializers.CharField(label='Short Description', allow_blank=True)
    blocks = DocumentationBlock(many=True)
    script = serializers.CharField(label='Script', allow_blank=True)
    id = serializers.CharField(label='Id')
    reviewId = serializers.IntegerField(required=False)


class DocumentsSerializer(serializers.Serializer):
    docs = DocumentationPageSerializer(many=True)
    page = serializers.IntegerField(label='Page number'),
    pageSize = serializers.IntegerField(label='Max number of docs per page'),
    totalPages = serializers.IntegerField(label='Total number of pages'),
    totalResults = serializers.IntegerField(label='Total number documents for search')


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


class CustomClientSerializer(serializers.ModelSerializer):
    class ValuesSerializer(serializers.Serializer):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self.custom_values = AssetType.get_custom_fields_by_type(AssetType.ASSET_TYPES.vms)
            self.custom_values = {
                key: value for key, value in self.custom_values.items()
                if self.custom_values[key].get('source', '') == 'custom' and not (
                    self.custom_values[key].get('metaOnly', False) and settings.CUSTOMIZATION != 'meta')
            }
            for field_name, field_props in self.custom_values.items():
                optional = field_props.get('optional', False)
                self.fields[field_name] = serializers.CharField(
                    required=not optional, allow_blank=optional, label=field_props.get('label', field_name)
                )
                # Needed to handle "." in variable names being split
                self.fields[field_name].source_attrs = [field_name]

        def validate(self, data):
            for key in self.custom_values:
                if key not in data:
                    data[key] = self.parent.instance.values.get(key, '')
            return data

    created_by = serializers.SlugRelatedField(slug_field='email', read_only=True)
    values = ValuesSerializer(required=False, partial=True)

    class Meta:
        model = CustomClient
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.request = kwargs.get('request', None)
        if settings.CUSTOMIZATION != 'meta' or not self.context.get('request', None):
            self.fields['base_vms'].read_only = True
        else:
            self.fields['base_vms'].queryset = self.context['request'].user.custom_client_vms_assets


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
        else:
            current = instance.result.get('current', 0)
            total = instance.result.get('total', 0)
            return {'state': 'pending', 'current': current, 'total': total}


class PackageDownloadIdSerializer(serializers.Serializer):
    downloadId = serializers.UUIDField()
