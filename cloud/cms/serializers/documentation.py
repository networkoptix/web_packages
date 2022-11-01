"""
Serializers for documentation and documentation structs.
"""

from rest_framework import serializers


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
