import logging
import json

from django.core.management.base import BaseCommand
from cms.controllers.structure_to_html import process_structure_json

logger = logging.getLogger(__name__)


def process_from_cms_structure_json():
    with open("cms/asset_structure_template.html.mustache") as template_file:
        template = template_file.read()

    with open("cms/cms_structure.json", "r") as f:
        asset_types = json.load(f)
        for asset_type in asset_types:
            html_file = process_structure_json(asset_type, template)
            with open(f"cms/{asset_type['type']}.html", "w+") as out_file:
                out_file.write(html_file)


class Command(BaseCommand):
    help = "Generates html files for asset types in cms_structure.json"

    def handle(self, *args, **options):
        process_from_cms_structure_json()
