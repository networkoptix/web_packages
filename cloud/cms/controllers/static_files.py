import asyncio
import base64
import json
import os
import typing
import re
from hashlib import md5
from logging import getLogger
from typing import Tuple, Optional

import waffle
from asgiref.sync import sync_to_async
from django.conf import settings
from django.core.cache import caches
from django.core.files.base import ContentFile
from django.db.models import QuerySet

from cloud.helpers.exceptions import APINotFoundException
from cms.controllers.filldata import ContextProcessor, global_contexts_to_dict
from cms.feature_flags.feature_flags import FLAGS
from cms.models import Asset, AssetType, Language, Context, DataStructure, ContextTemplate, \
    Customization, DataRecord, ExternalFile, AssetCustomizationReview, \
    get_cloud_portal_asset
from util.base_cache import HashCache
from util.config import get_customization_config

logger = getLogger(__name__)


class StaticFileNotFound(Exception):
    pass


class TemplatesCache(HashCache):
    _cache_name = 'templates'
    _timeout = 86400 * 10

    def __init__(self, customization_name, template_name, language_code, skin, version_id):
        host = get_customization_config(customization_name)['host']
        field_key = f'{host}-{template_name}-{language_code}-{skin}-{version_id}'
        hash_key = f'templates-{customization_name}-{settings.VERSION}'
        super().__init__(hash_key=hash_key, field_key=field_key)

    @classmethod
    def invalidate_template_cache(cls, template_name, language_code, skin):
        cache = caches[cls._cache_name]
        keys = cache.keys(f'templates-*-{settings.VERSION}')
        for key in keys:
            for field, _ in cache.hscan_iter(key, f'{template_name}-{language_code}-{skin}-*'):
                cache.hdel(key, field)

    @classmethod
    def invalidate_customization_cache(cls, customization_name: str):
        cache = caches[cls._cache_name]
        cache.delete(f'templates-{customization_name}-{settings.VERSION}')


def get_contexts(asset):
    global_contexts = Context.objects.filter(
        is_global=True, hidden=False, asset_type=asset.asset_type)
    global_contexts_dict = global_contexts_to_dict(global_contexts, asset)
    return global_contexts, global_contexts_dict


def read_customized_db_file(asset: Asset, customization_name: str, filename: str,
                            language_code: str, skin: str, version_id: int) -> typing.Any:
    """
    Reads customized template or file value from DB. Value must be saved by
    `readstructure` or by user in GUI.
    Args:
        asset (Asset, required): cloud portal asset
        customization_name (str, required): customization name
        filename (str, required): file/template name
        language_code (str, required): language code
        skin (str, required): skin name
        version_id (int, required): asset review version id
    Returns typing.Any: return template string or file content

    """
    language = Language.by_code(language_code, asset.default_language)
    clean_name = filename.replace(
        language_code, "{{language}}") if language_code else filename
    context: Context = Context.objects.filter(
        file_path=clean_name, asset_type=asset.asset_type).first()
    if context:
        # success -> return process_context
        global_contexts, global_contexts_dict = get_contexts(asset)
        context_processor = ContextProcessor(
            asset=asset, preview=False, version_id=version_id,
            global_contexts=global_contexts,
            global_contexts_dict=global_contexts_dict, skin=skin
        )
        return context_processor.process_context(context=context, language=language)

    # 2. try to find datastructure for this file
    # TODO: name is not unique
    data_structure: DataStructure = DataStructure.objects.filter(
        name=clean_name, context__asset_type=asset.asset_type).first()
    if data_structure:
        value = data_structure.find_actual_value(
            asset, language=language, version_id=version_id, customization_name=customization_name)
        if not value:
            value = data_structure.placeholder
        return base64.b64decode(value)

    # temporary raise exception to catch missing templates
    # must be handled in view or notification engine
    raise StaticFileNotFound(f"Template {filename}, {language_code}, {skin} is"
                             f" missing for customization {customization_name}.")


def read_db_email_file(asset: Asset, customization_name: str, filename: str,
                       language_code: str, skin: str, version_id: int):
    lang = Language.by_code(language_code=language_code)
    template = read_db_context_template(asset, customization_name, filename, lang, skin, version_id)
    if not re.findall(f'%[_A-Z]+%', template):
        # do not try to "render" customization variables if they are missing in template
        return template
    ds_names = [
        '%SUPPORT_LINK_TEXT%',
        '%CLOUD_NAME%',
        '%COMPANY_LINK%',
        '%SUPPORT_LINK%',
    ]
    data_structures = DataStructure.objects.filter(
        context__asset_type=asset.asset_type,
        name__in=ds_names
    )
    values = DataStructure.find_actual_values(
        data_structures=data_structures, asset=asset,
        language=lang, version_id=version_id,
        customization_name=customization_name
    )
    for ds, dr_val in values.items():
        template = template.replace(ds.name, dr_val)
    return template


def read_db_context_template(asset: Asset, customization_name: str, filename: str,
                             language: typing.Union[str, Language], skin: str, version_id: int):
    if isinstance(language, str):
        language = Language.by_code(language_code=language)
    context_template = ContextTemplate.objects.filter(
        context__asset_type=asset.asset_type,
        context__file_path=filename, skin=skin,
        language=language
    ).first()
    if not context_template:
        raise StaticFileNotFound(f'Cannot find context template for {filename}, '
                                 f'{skin}, {language.code} for {customization_name}.')
    if not (template := context_template.template):
        raise StaticFileNotFound(f'Template is empty for {filename}, '
                                 f'{skin}, {language.code} for {customization_name}.')
    return template


def read_cached_file(asset: Asset, customization_name: str, filename: str, language_code: str,
                     skin: str, version_id: int, is_email: bool = False) -> typing.Any:
    """
    Tries to get file or template content from cache, if it is missed then loads value from DB.
    Args:
        asset (Asset, required): cloud portal asset
        customization_name (str, required): customization name
        filename (str, required): file/template name
        language_code (str, required): language code
        skin (str, required): skin name
        version_id (int, required): asset review version id

    Returns typing.Any: returns template string or file content

    """
    templates_cache = TemplatesCache(customization_name, filename, language_code, skin, version_id)
    if data := templates_cache.get_value():
        logger.info(f"Got file {filename} from cache.")
        return data
    if is_email:
        # read email template
        data = read_db_email_file(asset, customization_name, filename, language_code, skin, version_id)
        logger.info(f"Got email file {filename} from db.")
    else:
        # read view template
        data = read_customized_db_file(asset, customization_name, filename, language_code, skin, version_id)
        logger.info(f"Got file {filename} from db.")
    templates_cache.set_value(data)
    return data


async def get_template(request, filename: str, language_code: str = None):
    cloud_portal = await Asset.objects.filter(customizations__name__in=[request.CUSTOMIZATION], asset_type__name="",
                                              asset_type__type=AssetType.ASSET_TYPES.cloud_portal).afirst()
    if not cloud_portal:
        raise APINotFoundException(f"Customization {request.CUSTOMIZATION} not found.")
    version_id, skin = await asyncio.gather(
        sync_to_async(cloud_portal.version_id)(),
        sync_to_async(cloud_portal.read_global_value)('%SKIN%')
    )
    content = await sync_to_async(read_cached_file)(cloud_portal, request.CUSTOMIZATION, filename,
                                                    language_code, skin, version_id)
    return content


def read_all_customization_values(qs: QuerySet):
    vals = set()
    for obj in qs:
        if not obj.template or not obj.template.strip():
            print(f"Missing template: {obj}")
        if found := re.findall(r'%[_A-Z]+%', obj.template):
            vals.update(set(found))
    for val in vals:
        print(val)


def load_structure():
    path = os.path.join(settings.BASE_DIR, 'cms/structures/cloud_structure.json')
    with open(path, 'r') as f:
        struct = json.load(f)
    return struct


# OLD_ROOT = 'static/'
# NEW_ROOT = 'static/customizable/'
names_translation = (
    ("static/images/placeholders/page/Maintenance.svg", "static/customizable/images/placeholders/page/Maintenance.svg"),
    ("static/images/favicon.ico", "static/customizable/images/favicon.ico"),
    ("static/images/logo.png", "static/customizable/images/logo.png"),
    ("static/images/dark_logo.png", "static/customizable/images/dark_logo.png"),
    ("templates/email_logo.png", "static/customizable/templates/email_logo.png"),
    ("static/images/promo/landing_promo_1.svg", "static/customizable/images/promo/landing_promo_1.svg"),
    ("static/images/promo/landing_promo_dark_1.svg", "static/customizable/images/promo/landing_promo_dark_1.svg"),
    ("static/images/promo/landing_promo_2.svg", "static/customizable/images/promo/landing_promo_2.svg"),
    ("static/images/promo/landing_promo_dark_2.svg", "static/customizable/images/promo/landing_promo_dark_2.svg"),
    ("static/images/promo/landing_promo_3.svg", "static/customizable/images/promo/landing_promo_3.svg"),
    ("static/images/promo/landing_promo_dark_3.svg", "static/customizable/images/promo/landing_promo_dark_3.svg"),
)


def save_values_to_fs(path):
    structures = load_structure()
    for ctx in structures['contexts']:
        for value in ctx['values']:
            if not value.get('type') in ['file', 'image']:
                continue
            if not (content := value.get('value')):
                continue
            fn = value["name"].split('/')[-1]
            with open(os.path.join(path, fn), 'wb') as f:
                f.write(base64.b64decode(content))


def get_new_name(old_name):
    old_to_new = {o: n for o, n in names_translation}
    return old_to_new[old_name]


def get_old_name(new_name):
    new_to_old = {n: o for o, n in names_translation}
    return new_to_old[new_name]


def get_structures(context: Context, new_structure_name: str) -> Tuple[Optional[DataStructure], Optional[DataStructure]]:
    data_structure = context.datastructure_set.filter(name=new_structure_name).last()
    old_structure_name = get_old_name(new_structure_name)
    old_structure = context.datastructure_set.filter(name=old_structure_name).last()
    return data_structure, old_structure


def convert_data_records(customization: Customization, asset: Asset, context: Context,
                         new_structure: DataStructure, old_structure: DataStructure):
    old_type_data_records = DataRecord.objects.filter(data_structure=old_structure, asset=asset)
    for odr in old_type_data_records:
        odr.data_structure = new_structure

        # if empty leave it
        if not odr.value:
            odr.save()
            continue

        content = base64.b64decode(odr.value)
        ext_file = ExternalFile.objects.create(file=ContentFile(content, name=new_structure.name.split('/')[-1]),
                                               asset=asset, data_structure=new_structure)
        odr.external_file = ext_file
        odr.value = ext_file.file.url
        odr.save()


def set_latest_value(customization: Customization, asset: Asset, context: Context,
                     new_structure: DataStructure, old_structure: DataStructure):

    review = AssetCustomizationReview.objects.filter(version__asset=asset, customization=customization,
                                                     state=AssetCustomizationReview.REVIEW_STATES.accepted).last()
    if not review:
        return
    actual_content = old_structure.find_actual_value(
        asset=asset, customization_name=customization.name, use_cached=False)
    if new_structure.translatable:
        language = asset.default_language or customization.default_language
    else:
        language = None
    new_data_record, created = DataRecord.objects.get_or_create(asset=asset, customization=customization,
                                                                version=review.version, data_structure=new_structure,
                                                                language=language)
    if not created:
        logger.warning(f"Data record for structure {new_structure} already exist. Skipping structure!")
        return
    content = base64.b64decode(actual_content)
    ext_file = ExternalFile.objects.create(file=ContentFile(content, name=new_structure.name.split('/')[-1]),
                                           asset=asset, data_structure=new_structure)
    new_data_record.external_file = ext_file
    new_data_record.value = ext_file.file.url
    new_data_record.save()


def convert_structures_in_customization(customization_name: str, convert_records: bool = False):
    """
    Convert files data records to using S3 external files
    Args:
        customization_name: customization name
        convert_records: if set to True then existing data record will be converted to new data
         structures otherwise new data records will be created within the latest version

    Returns:

    """
    customization = Customization.objects.filter(name=customization_name).last()
    if not customization:
        raise ValueError(f"Customization '{customization_name}' not found in DB.")
    cloud_portal = get_cloud_portal_asset(customization=customization_name, no_create=True)
    if not cloud_portal:
        raise ValueError(f"Cloud portal asset for customization '{customization_name}' not found in DB.")
    struct = load_structure()
    for ctx in struct['contexts']:
        convert_context(cloud_portal, customization, ctx, convert_records)


def convert_context(cloud_portal, customization, ctx, convert_all_records: bool = False):
    context = Context.objects.filter(asset_type=cloud_portal.asset_type, name=ctx["name"]).last()
    if not context:
        logger.warning(f"Context '{ctx['name']}' for cloud portal asset and "
                       f"customization '{customization.name}' not found in DB.")
        return
    for val in ctx.get('values', []):
        if val["type"] not in ("external_file", "external_image"):
            continue
        old_structure_name = get_old_name(val["name"])
        new_structure, old_structure = get_structures(context, val["name"])
        if not new_structure:
            logger.warning(f"External Data structure not found. Context: {context}, name:{val['name']}")
            continue
        if not old_structure:
            logger.warning(f"Data structure not found. Context: {context}, name:{old_structure_name}")
            continue
        if convert_all_records:
            convert_data_records(customization, cloud_portal, context, new_structure, old_structure)
        else:
            set_latest_value(customization, cloud_portal, context, new_structure, old_structure)


def get_s3_static_links(asset, customization_name: str):
    from cms.controllers.asset_json import replace_s3_link

    data_structures = DataStructure.objects.filter(
        context__asset_type=asset.asset_type,
        type__in=[DataStructure.DATA_TYPES.external_file,
                  DataStructure.DATA_TYPES.external_image],
        name__startswith='static/customizable/'
    )
    values = DataStructure.find_actual_values(
        data_structures=data_structures, asset=asset, customization_name=customization_name)
    return {
        ds.name.replace('static/customizable/', 'static/'): replace_s3_link(value, customization_name)
        for ds, value in values.items()
    }


def get_static_files_links(request, customization):
    if waffle.flag_is_active(request, FLAGS.s3_static):
        asset = get_cloud_portal_asset(customization=customization, no_create=True)
        return get_s3_static_links(asset, customization)
    return {o: o for o, n in names_translation}


async def get_customizable_static(customization_name: str, static_path: str):
    """
    Get customizable static content from DB data record.
    Args:
        customization_name: customization name
        static_path: static path, same as data structure name

    Returns:

    """

    asset = await sync_to_async(get_cloud_portal_asset)(customization=customization_name)
    data = await sync_to_async(read_cached_file)(asset=asset, customization_name=customization_name,
                                                 filename=static_path, language_code=None, skin=None,
                                                 version_id=None)
    return data


def get_languages_json(asset: Asset, customization_name: str, no_cache=True):
    template_cache = TemplatesCache(customization_name=customization_name, template_name='static/languages.json',
                                    language_code=None, skin=None, version_id=None)
    if not no_cache and (languages_json := template_cache.get_value()):
        return languages_json
    languages = Language.objects.filter(code__in=asset.languages_list)
    languages_json = [{"name": lang.name, "language": lang.code}
                      for lang in languages]
    template_cache.set_value(languages_json)
    return languages_json
