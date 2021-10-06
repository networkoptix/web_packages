import logging
import json

from django.core.management.base import BaseCommand
from cms.controllers import structure
from cms.controllers import structure_to_html

logger = logging.getLogger(__name__)


def get_template(template_file):
    return template_file.read()


def process_from_cms_structure_json():
    with open("cms/asset_structure_template.html.mustache") as template_file:
        template = get_template(template_file)

    asset_types = structure.read_structure_files()
    for asset_type in asset_types:
        html_file = structure_to_html.process_structure_json(asset_type, template)
        with open(f"cms/{asset_type['type']}.html", "w+") as out_file:
            out_file.write(html_file)


class Command(BaseCommand):
    help = "Generates html files for asset types in *_structure.json files"

    def handle(self, *args, **options):
        process_from_cms_structure_json()
