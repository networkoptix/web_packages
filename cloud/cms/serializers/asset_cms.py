"""
Serializers for Asset CMS on the frontend.
"""

from django.conf import settings
from rest_framework import serializers

from cloud.customization_context import customization_ctx
from cms.models import Asset, AssetType, Context, DataStructure



class FieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataStructure
        fields = 'name', 'label', 'type', 'description', 'optional'


class AssetContextSerializer(serializers.Serializer):
    class Meta:
        model = Context
        fields = 'name', 'label', 'is_global'

    fields = FieldSerializer(many=True)


class ManifestSerializer(serializers.Serializer):
    contexts = AssetContextSerializer(many=True)


class AssetManifestSerializer(serializers.Serializer):
    type = serializers.IntegerField()
    name = serializers.CharField()
    manifest = ManifestSerializer()

    def generate(asset_types: AssetType, validate=False):
        many = not isinstance(asset_types, AssetType)
        asset_types = asset_types if many else [asset_types]
        data = [{
            'type': asset_type.id,
            'name': str(asset_type),
            'manifest': {
                'contexts': [
                    {
                        'name': context.name,
                        'label': context.label,
                        'is_global': context.is_global,
                        'fields': [
                            {
                                attr: getattr(ds, attr, '')
                                for attr in ['name', 'label', 'type', 'description', 'optional']
                            }
                            for ds in context.datastructure_set.all()
                        ]
                    }
                    for context in asset_type.context_set.all()
                ]
            }
        } for asset_type in asset_types]

        serializer = AssetManifestSerializer(
            data=data if many else data[0], many=many)

        if validate:
            serializer.is_valid()

        return serializer


class AssetDataRecordSerializer(serializers.Serializer):
    def __init__(self, *args, **kwargs):
        self.asset = kwargs.pop('asset', None)
        super().__init__(*args, **kwargs)

    def to_representation(self, instance):
        self._instance = instance
        ds = DataStructure.objects.get(id=instance)
        request = self.context.get("request")
        customization = getattr(request, 'CUSTOMIZATION', customization_ctx.get())
        return ds.find_actual_value(
            self.asset, draft=True, customization_name=customization)


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
