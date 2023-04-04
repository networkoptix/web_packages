import pytest
from django.conf import settings


def test_cloud_request_factory(arf, mocker):
    # test default CUSTOMIZATION
    request = arf.get('/')

    assert request.META['CUSTOMIZATION'] == settings.TEST_CUSTOMIZATION
    assert request.CUSTOMIZATION == settings.TEST_CUSTOMIZATION

    # test other CUSTOMIZATION
    customization_name = 'another_customization'
    request = arf.post('/', customization_name=customization_name)
    assert request.META['CUSTOMIZATION'] == customization_name
    assert request.CUSTOMIZATION == customization_name
