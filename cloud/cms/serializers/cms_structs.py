"""
Serializers for Django CMS views.
"""

from rest_framework import serializers

from cms.models import AssetType, Context, DataStructure


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
