import json
from uuid import uuid4

import boto3
import moto
from django.conf import settings

from api.views.systems import md5
from util.ipvd_storage import IPVDS3Upload
from api.tests.views.conftest import *


class TestIPVDS3Upload:

    def test_ipvd_changed(self, mocker):
        etag = md5(f'{uuid4()}')
        mocker.patch('util.ipvd_storage.IPVDS3Upload.get_orig_etag', return_value=etag)
        is_changed = IPVDS3Upload().ipvd_changed()
        assert is_changed

    def test_ipvd_data(self, mocker, ipvd_data, ipvd_data_processed):
        mocker.patch('util.ipvd_storage.IPVDS3Upload.get_ipvd', return_value=ipvd_data)
        data = IPVDS3Upload().ipvd_data()
        assert data == ipvd_data_processed

    @moto.mock_aws
    def test_update_ipvd_data(self, mocker, ipvd_data, ipvd_data_processed):
        conn = boto3.resource("s3", region_name="us-east-1")
        conn.create_bucket(Bucket=settings.AWS_STORAGE_BUCKET_NAME)
        etag = md5(f'{uuid4()}')
        mocker.patch('util.ipvd_storage.IPVDS3Upload.get_orig_etag', return_value=etag)
        mocker.patch('util.ipvd_storage.IPVDS3Upload.get_ipvd', return_value=ipvd_data)
        IPVDS3Upload().update_ipvd_data()

        assert IPVDS3Upload().get_latest_etag() == etag
        uploaded_file = IPVDS3Upload().open(IPVDS3Upload.filename)
        uploaded_file = json.loads(uploaded_file.read().decode('utf-8'))
        assert uploaded_file == ipvd_data_processed
