# read source folder
# find all cms templates (%...%)
# update database structure
# mark everything in the database which was not found in sources
# create report: added vs outdated
import os
import re
import json
import codecs
import time
from cloud import settings
from cloud.debug import timer
from cms.controllers import structure
from cms.models import *
from django.core.management.base import BaseCommand
from django.core.cache import caches
import logging
logger = logging.getLogger(__name__)

SOURCE_DIR = 'static/_source/{{skin}}/'


def create_new_cloudportals_for_each_customization(logger):
    logger.stdout.write(logger.style.SUCCESS("\nCreating cloud portal for each customization"))
    customizations = Customization.objects.all()

    for customization in customizations:
        records_with_name = DataRecord.objects.filter(data_structure__name="%CLOUD_NAME%",
                                                      customization=customization) \
            .exclude(version=None).last()
        if records_with_name:
            asset_name = records_with_name.value
            logger.stdout.write(logger.style.SUCCESS("\tAsset name for {} is {}".
                                                     format(customization.name, asset_name)))
        else:
            asset_name = "Cloud Portal"
            logger.stdout.write(logger.style.SUCCESS("\tCouldn't find asset name for {} using {}".
                                                     format(customization.name, asset_name)))
        cloud = structure.find_or_add_asset_with_single_customization(asset_name, customization, "cloud_portal", "")
        cloud.customizations.add(customization)
        cloud.save()
    logger.stdout.write(logger.style.SUCCESS("Done creating new cloud portals"))


def move_contexts_to_assettype(logger):
    logger.stdout.write(
        logger.style.SUCCESS("\nMoving contexts from original cloud portal to asset_type cloud_portal"))
    cloud_portal = Asset.objects.get(name="cloud_portal")
    cloud_portal_type = structure.find_or_add_asset_type(AssetType.ASSET_TYPES.cloud_portal)

    for context in cloud_portal.context_set.all():
        logger.stdout.write(logger.style.SUCCESS("\tMoving {}".format(context.name)))
        context.asset_type = cloud_portal_type
        context.save()
    logger.stdout.write(logger.style.SUCCESS("Done moving contexts to asset_type cloud_portal"))


def move_revisions_to_new_cloud_portals(logger):
    logger.stdout.write(logger.style.SUCCESS("Moving revisions to new cloud portals"))
    original_cloud_portal = Asset.objects.get(id=1)

    new_clouds = Asset.objects.filter(asset_type__type=AssetType.ASSET_TYPES.cloud_portal) \
        .exclude(id=original_cloud_portal.id)

    original_content_versions = ContentVersion.objects.filter(asset=original_cloud_portal)

    for cloud in new_clouds:
        logger.stdout.write(
            logger.style.SUCCESS("\tMoving {} revisions to {}".
                                 format(cloud.customizations.first(), cloud.name)))
        customization_content_versions = original_content_versions.filter(
            customization=cloud.customizations.first())
        for content_version in customization_content_versions:
            content_version.asset = cloud
            content_version.save()
            for datarecord in content_version.datarecord_set.all():
                datarecord.asset = cloud
                datarecord.save()
    logger.stdout.write(logger.style.SUCCESS("Done moving revisions to new cloud portals"))


def migrate_18_3_to_18_4(logger):
    # If there are not assets create a AssetType of cloud_portal and we can skip migrating 18 -> 19
    if not Asset.objects.all().exists():
        structure.find_or_add_asset_type(AssetType.ASSET_TYPES.cloud_portal)

    if AssetType.objects.all().exists():
        logger.stdout.write(logger.style.SUCCESS("Migration has already been completed skipping this step"))
        return

    move_contexts_to_assettype(logger)
    create_new_cloudportals_for_each_customization(logger)
    move_revisions_to_new_cloud_portals(logger)

    logger.stdout.write(logger.style.SUCCESS("Done moving records from 18.3 to 18.4"))


def context_for_file(filename, skin_name):
    custom_dir = SOURCE_DIR.replace("{{skin}}", skin_name)
    context_name = filename.replace(custom_dir, '')
    match = re.search(r'lang_(.+?)/', context_name)
    language = None
    if match:
        language = match.group(1)
        context_name = context_name.replace(
            match.group(0), 'lang_{{language}}/')
    return context_name, language


def customizable_file(filename, ignore_not_english):
    supported_format = filename.endswith('.json') or \
        filename.endswith('.html') or \
        filename.endswith('.mustache') or \
        filename.endswith('apple-app-site-association')
    supported_directory = not ignore_not_english or \
        "lang_" not in filename or "lang_en_US" in filename
    return supported_format and supported_directory


def iterate_cms_files(skin_name, ignore_not_english):
    custom_dir = SOURCE_DIR.replace("{{skin}}", skin_name)
    for root, dirs, files in os.walk(custom_dir):
        for filename in files:
            file = os.path.join(root, filename)
            if customizable_file(file, ignore_not_english):
                yield file


def find_or_add_context_by_file(file_path, asset_type, has_language):
    context = Context.objects.filter(file_path=file_path, asset_type=asset_type).first()
    # Check so that static article contexts stay deprecated
    if 'views/static/' not in file_path:
        if not context:
            context = Context(name=file_path, file_path=file_path, asset_type=asset_type,
                              translatable=has_language, hidden=True, is_global=False)
        else:
            context.deprecated=False

        context.save()
        return context


def find_or_add_context_template(context, language_code, skin):
    context_template = ContextTemplate.objects.filter(
        context__id=context.id, language__code=language_code, skin=skin
    ).first()
    if not context_template:
        context_template = ContextTemplate(context=context, language=Language.by_code(language_code), skin=skin)
        context_template.save()
    return context_template


def read_cms_strings(filename):
    pattern = re.compile(r'%\S+?%')
    with open(filename, 'r') as file:
        data = file.read()
        return data, set(re.findall(pattern, data))


def read_structure_file(filename, asset_type, global_strings, skin):
    context_name, language_code = context_for_file(filename, skin)

    # now read file and get records from there.
    data, strings = read_cms_strings(filename)
    if not strings:  # if there is no records at all - we ignore it
        return

    # now, here this is customization-depending file

    # Here we check if there are any unique strings (which are not global)
    strings = [string for string in strings if string not in global_strings]
    context = find_or_add_context_by_file(context_name, asset_type, bool(language_code))
    if context:
        context_template = find_or_add_context_template(context, language_code, skin)
        context_template.template = data  # update template for this context
        context_template.save()
        for string in strings:
            structure.find_or_add_data_structure(string, None, context, bool(language_code))


def read_structure(asset_type):
    asset_type = structure.find_or_add_asset_type(asset_type)
    global_strings = DataStructure.objects.\
        filter(context__is_global=True, context__asset_type=asset_type).\
        values_list("name", flat=True)
    for skin in settings.SKINS:
        for file in iterate_cms_files(skin, False):
            read_structure_file(file, asset_type, global_strings, skin)


def find_or_add_language(language_code):
    language = Language.by_code(language_code)
    if not language:
        language = Language(code=language_code, name=language_code)

    if language.code == language.name:  # name and code are the same - try to update name
        # try to read language.json for LANGUAGE_NAME
        language_json_path = os.path.join(SOURCE_DIR.replace("{{skin}}", settings.DEFAULT_SKIN),
                                          "static", "lang_" + language_code,
                                          "language_compiled.json")

        with codecs.open(language_json_path, 'r', 'utf-8') as file_descriptor:
            language_content = json.load(file_descriptor)
        language_name = language_content["ajs"]["language_name"]
        language.name = language_name
        language.save()

    return language


def read_languages(skin_name):
    languages_dir = os.path.join(SOURCE_DIR.replace("{{skin}}", skin_name), "static")
    languages = [directory.replace('lang_', '') for directory in os.listdir(languages_dir)
                 if directory.startswith('lang_')]
    for language_code in languages:
        find_or_add_language(language_code)


class Command(BaseCommand):
    help = 'Creates initial structure for CMS in ' \
           'the database (contexts, datastructure)'

    def add_arguments(self, parser):
        parser.add_argument('asset_type', nargs='?', default='cloud_portal')

    @timer
    def handle(self, *args, **options):
        migrate_18_3_to_18_4(self)
        asset_type = AssetType.get_type_by_name(options['asset_type'])
        read_languages(settings.DEFAULT_SKIN)
        if not Customization.objects.filter(name=settings.CUSTOMIZATION).exists():
            default_customization = Customization(name=settings.CUSTOMIZATION,
                                                  default_language=Language.by_code('en_US'))
            default_customization.save()
            default_customization.languages.add(Language.by_code('en_US'))
            default_customization.save()

        structure.read_structure_json('cms/cms_structure.json')
        read_structure(asset_type)
        self.stdout.write(self.style.SUCCESS(
            'Successfully initiated data structure for CMS'))

        caches['deployment'].set(settings.DEPLOYMENT_READY, True)
