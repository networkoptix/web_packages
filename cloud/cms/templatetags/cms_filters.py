import json

from django import template

from cms.models import *
from util.helpers import get_customization

register = template.Library()


@register.filter
def portal_name(customization):
    return get_cloud_portal_asset(customization=customization).name


@register.simple_tag
def is_protected(data_structure, asset):
    return data_structure.is_protected(asset) if data_structure else False


@register.simple_tag
def get_data_structure(data_structure_name, context):
    return DataStructure.objects.filter(context=context, name=data_structure_name).first()


@register.simple_tag
def is_external_file_or_image(data_structure_name, context):
    query = DataStructure.objects.filter(context=context, name=data_structure_name).first()
    if query:
        return query.type in [DataStructure.DATA_TYPES.external_file, DataStructure.DATA_TYPES.external_image]
    return False


@register.simple_tag
def has_value(data_structure_name, asset, context, language_code):
    data_structure = DataStructure.objects.filter(context=context, name=data_structure_name).first()

    if not data_structure:
        return False

    if not data_structure.translatable:
        language_code = None

    return data_structure.datarecord_set.filter(asset=asset, language__code=language_code).exists()


@register.simple_tag
def get_datastructure_type(data_structure):
    return DataStructure.DATA_TYPES[data_structure.type] if data_structure else 0


@register.simple_tag
def get_asset_type(asset):
    if asset:
        return AssetType.ASSET_TYPES[asset.asset_type.type]
    return asset


@register.simple_tag
def get_review_state(state):
    return AssetCustomizationReview.REVIEW_STATES[state]


@register.simple_tag
def has_permission(user, asset, permission=None):
    return UserGroupsToAssetPermissions.check_permission(user, asset, permission)


@register.simple_tag(takes_context=True)
def has_customization_permission(user, customization, permission, context):
    customization = customization or get_customization(context['request'])
    return UserGroupsToAssetPermissions.check_customization_permission(user, customization, permission)


@register.filter
def modulo(value, arg):
    return int(value) % int(arg)


@register.filter
def nice_multiselect(multiselect_record):
    return ', '.join(json.loads(multiselect_record.value))


@register.filter
def get_form_item(form, key):
    return form[key]


@register.filter
def dict_key(d, key):
    return d.get(key, None)

@register.filter
def get_item(dictionary, key):
    return dictionary.get(key)
