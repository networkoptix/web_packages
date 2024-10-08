import httpx
import json
import structlog
from django.conf import settings
from django.utils.functional import cached_property
from io import BytesIO
from storages.backends.s3boto3 import S3Boto3Storage
from storages.utils import clean_name

from api.serializers import process_cameras

logger = structlog.getLogger(__name__)


class IPVDS3Upload(S3Boto3Storage):
    location = 'ipvd'
    file_overwrite = True
    filename = 'cameras.json'
    meta_param_name = 'orig-etag'
    header_name = f'x-amz-meta-{meta_param_name}'

    def get_orig_etag(self):
        orig_head = httpx.head(settings.IPVD_CONNECT, params="[]")
        # If something wrong it must fail to stop processing.
        orig_head.raise_for_status()
        return orig_head.headers.get('etag', '').strip('"')

    @cached_property
    def orig_etag(self) -> str:
        return self.get_orig_etag()

    def ipvd_changed(self) -> bool:
        latest = self.get_latest_etag()
        if not latest:
            return True
        return latest != self.orig_etag

    def get_ipvd(self):
        ipvd = httpx.get(settings.IPVD_CONNECT, params="[]")
        ipvd.raise_for_status()
        return ipvd.json()

    def ipvd_data(self):
        ipvd = process_cameras(self.get_ipvd())
        if not all([k in ipvd for k in ("cameras", "vendors", "analytics", "num_cameras")]):
            logger.error("invalid_ipvd_info")
            raise ValueError("IPVD info in not valid.")
        return ipvd

    def update_ipvd_data(self, force=True):
        url = self.url(self.filename)
        if not force and not self.ipvd_changed():
            logger.info("ipvd_info_unchanged", url=url)
            return
        ipvd = BytesIO(json.dumps(self.ipvd_data()).encode())
        name = self.save(self.filename, ipvd)
        logger.info("ipvd_info_updated", url=url)
        return name

    def _get_write_parameters(self, name, content=None):
        params = super()._get_write_parameters(name, content=content)
        params["Metadata"] = {self.meta_param_name: self.orig_etag}
        return params

    def get_latest_etag(self):
        name = self._normalize_name(clean_name(self.filename))
        try:
            meta = self.bucket.meta.client.head_object(Bucket=self.bucket_name, Key=name)
        except Exception as err:
            return None
        return meta['Metadata'].get(self.meta_param_name)
