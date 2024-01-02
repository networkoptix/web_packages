import os
import sys
import logging
import traceback
from typing import Tuple, Iterable

import requests
from django.core.management.base import BaseCommand

from cms.models import Customization, Language

logger = logging.getLogger(__name__)
S3_IREG_URL = 'https://s3.ireg.hdw.mx.s3.amazonaws.com/cloud_hosts.json'
HDW_IREG_URL = 'https://ireg.hdw.mx/api/v1/public/products/nxcloud/instances/'


def get_ireg(url: str):
    response = requests.get(url)
    response.raise_for_status()
    return response.json()


def get_customizations_s3(instance_name: str) -> Iterable[Tuple[str, str]]:
    ireg = get_ireg(S3_IREG_URL)
    if instance_name not in ireg["groups"]:
        raise ValueError(f"Instance {instance_name} not found in data.")
    instance = ireg["groups"][instance_name]
    return instance.items()


def get_customizations_hdw_mx(instance_name: str) -> Iterable[Tuple[str, str]]:
    ireg = get_ireg(HDW_IREG_URL)
    if not (instance := next(filter(lambda i: i["name"] == instance_name, ireg), None)):
        raise ValueError(f"Instance {instance_name} not found in data.")
    return [
        (c["cloud_customization"], c["domain"])
        for c in instance["instance_customizations"]
    ]


def get_customizations():
    instance_name = os.getenv('INSTANCE_NAME', None)
    if not instance_name:
        raise ValueError('Environment variable INSTANCE_NAME is not set.')
    customizations = get_customizations_hdw_mx(instance_name)
    if not customizations:
        raise ValueError(f'There is no customizations for instance {instance_name}.')
    return customizations


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument(
            '--ignore_missing', nargs='?', type=str, default=False)

    def handle(self, *args, **options):
        try:
            customizations = get_customizations()
        except Exception as e:
            logger.error(f"Failed to get cloud hosts: {e}")
            logger.error(traceback.format_exc())
            if options.get('ignore_missing'):
                return
            sys.exit(1)
        en_us = Language.objects.get(code="en_US")
        for customization_name, hostname in customizations:
            customization, created = Customization.objects.get_or_create(
                name=customization_name, defaults={'host': hostname, 'default_language': en_us}
            )
            if created:
                logger.info(f"Created customization: {customization_name}. Host: {hostname}.")
                continue
            if customization.host == hostname:
                logger.info(f"Customization: {customization_name}. Host: {hostname}. Does not require updating.")
                continue
            customization.host = hostname
            customization.save()
            logger.info(f"Updated customization: {customization_name}. Host: {hostname}.")

