import os
from typing import List, Tuple

import httpx


S3_IREG_URL = 'https://s3.ireg.hdw.mx.s3.amazonaws.com/cloud_hosts.json'
HDW_IREG_URL = 'https://ireg.hdw.mx/api/v1/public/products/nxcloud/instances/'


def get_ireg(url: str):
    response = httpx.get(url)
    response.raise_for_status()
    return response.json()


def get_customizations_s3(instance_name: str) -> List[Tuple[str, str]]:
    ireg = get_ireg(S3_IREG_URL)
    if instance_name not in ireg["groups"]:
        raise ValueError(f"Instance {instance_name} not found in data.")
    instance = ireg["groups"][instance_name]
    return instance.items()


def get_customizations_hdw_mx(instance_name: str) -> List[Tuple[str, str]]:
    ireg = get_ireg(HDW_IREG_URL)
    if not (instance := next(filter(lambda i: i["name"] == instance_name, ireg), None)):
        raise ValueError(f"Instance {instance_name} not found in data.")
    return [
        (c["cloud_customization"], c["domain"])
        for c in instance["instance_customizations"]
    ]


def get_customizations(instance_name: str) -> List[Tuple[str, str]]:
    if not instance_name:
        raise ValueError('Environment variable INSTANCE_NAME is not set.')
    customizations = get_customizations_hdw_mx(instance_name)
    if not customizations:
        raise ValueError(f'There is no customizations for instance {instance_name}.')
    return customizations
