import logging
import typing as t

import httpx

from nx_ireg.helpers import get_customizations

logger = logging.getLogger(__name__)


class IReg:
    def __init__(self, instance_name: str):
        self._customizations: t.List[t.Tuple[str, str]] = get_customizations(instance_name)

    @property
    def customizations(self) -> dict:
        return dict(self._customizations)

    def get_default_host(self) -> t.Optional[str]:
        return self.customizations.get("default")

    def iter_other_customizations(self) -> t.List[t.Tuple[str, str]]:
        for customization, hostname in self._customizations:
            if customization == "default":
                continue
            yield customization, hostname

    def get_other_customizations(self) -> t.List[t.Tuple[str, str]]:
        return [customization for customization in self._customizations if customization[0] != "default"]

    def get_host_by_customization(self, customization: str) -> str:
        if hostname := self.customizations.get(customization):
            return hostname
        # TODO. Add refreshing using cloud_portal API

    def get_customization_by_host(self, hostname: str, query_portal=False) -> t.Optional[str]:
        if customization := dict([(h, c) for c, h in self._customizations]).get(hostname):
            return customization
        # It is ambitious to make this. because we must be sure that passed
        if not query_portal:
            return None
        try:
            response = httpx.get(f'https://{hostname}/api/utils/customization')
            response.raise_for_status()
        except httpx.HTTPError as ex:
            logger.error(f"Cannot resolve {hostname} to customization. Exception {ex}")
            return None
        if response.status_code != 200:
            return None
        customization = response.json()
        customization = customization.get('name')
        self._customizations.append((customization, hostname))
        return customization
