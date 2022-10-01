# read source folder
# find all cms templates (%...%)
# update database structure
# mark everything in the database which was not found in sources
# create report: added vs outdated
import os
import re
import json
import codecs
import logging

from django.conf import settings
from django.core.management.base import BaseCommand
from django.core.cache import caches

from cloud.debug import timer
from cms.controllers import structure
from cms.models import *
from util.helpers import get_customization
logger = logging.getLogger(__name__)

SOURCE_DIR = 'static/_source/{{skin}}/'


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


CUSTOMIZABLE_FILES = ['.json', '.html', 'mustache', 'apple-app-site-association']


def customizable_file(filename, ignore_not_english):
    supported_format = any(
        filename.endswith(ending)
        for ending in CUSTOMIZABLE_FILES)
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
    context = Context.objects.filter(
        file_path=file_path, asset_type=asset_type).first()
    # Check so that static article contexts stay deprecated
    if 'views/static/' not in file_path:
        if not context:
            context = Context(name=file_path, file_path=file_path, asset_type=asset_type,
                              translatable=has_language, hidden=True, is_global=False)
        else:
            context.deprecated = False

        context.save()
    return context


def find_or_add_context_template(context, language_code, skin):
    context_template = ContextTemplate.objects.filter(
        context__id=context.id, language__code=language_code, skin=skin
    ).first()
    if not context_template:
        context_template = ContextTemplate(
            context=context, language=Language.by_code(language_code), skin=skin)
        context_template.save()
    return context_template


def read_cms_strings(filename):
    pattern = re.compile(r'%[\w_]+?%')
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
    strings = set(strings) - set(global_strings)
    context = find_or_add_context_by_file(
        context_name, asset_type, bool(language_code))
    if context:
        context_template = find_or_add_context_template(
            context, language_code, skin)
        context_template.template = data  # update template for this context
        context_template.save()
        for string in strings:
            structure.find_or_add_data_structure(
                string, None, context, bool(language_code))


def get_skins():
    return settings.SKINS


def read_structure(asset_type):
    asset_type = structure.find_or_add_asset_type(asset_type)
    global_strings = list(
        DataStructure.objects.
        filter(context__is_global=True, context__asset_type=asset_type).
        values_list("name", flat=True))
    for skin in get_skins():
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
            content = file_descriptor
            language_content = json.load(content)
        language_name = language_content["language_name"]
        language.name = language_name
        language.save()

    return language


def read_languages(skin_name):
    languages_dir = os.path.join(
        SOURCE_DIR.replace("{{skin}}", skin_name), "static")
    languages = [directory.replace('lang_', '') for directory in os.listdir(languages_dir)
                 if directory.startswith('lang_')]
    for language_code in languages:
        find_or_add_language(language_code)


class Command(BaseCommand):
    help = 'Creates initial structure for CMS in ' \
           'the database (contexts, datastructure)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--customization', nargs='?', default=get_customization(), type=str)
        parser.add_argument('asset_type', nargs='?', default='cloud_portal')

    @timer
    def handle(self, *args, **options):
        if not (asset_type_name := options.get('asset_type')):
            raise ValueError('asset_type required')

        asset_type = AssetType.get_type_by_name(asset_type_name)
        read_languages(settings.DEFAULT_SKIN)
        customization = options.get('customization', get_customization())
        if not Customization.objects.filter(name=customization).exists():
            default_customization = Customization.objects.create(
                name=customization, default_language=Language.by_code('en_US'))
            default_customization.languages.add(
                Language.by_code('en_US'))
            default_customization.save()

        structure.read_structure_json()
        read_structure(asset_type)
        self.stdout.write(self.style.SUCCESS(
            'Successfully initiated data structure for CMS'))

        structure.read_menu_structure('cms/menus.json')
        self.stdout.write(self.style.SUCCESS(
            'Successfully initiated menu structure'))

        caches['deployment'].set(settings.DEPLOYMENT_READY, True)
        self.stdout.write(self.style.SUCCESS(
            'Set deployment status to ready'))
