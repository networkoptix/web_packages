
from uuid import uuid4

import pytest
from nx_ireg.registry import IReg

from partners.models import (
    ChannelPartner,
    ChannelPartnerService,
)
from scripts.create_root_channel_partner import (
    NX_NAME,
    run,
)


class TestCreateRootChannelPartner:
    @pytest.fixture(autouse=True)
    def setup(self, mocker, cloud_test_host):
        self.default_host = f'{uuid4()}.com'
        self.other_host = f'{uuid4()}.com'

    def test_run_private_cloud(self, mocker, django_capture_on_commit_callbacks):
        spy_ireg_get_default_host = mocker.spy(IReg, 'get_default_host')
        spy_irg_get_other_customizations = mocker.spy(IReg, 'get_other_customizations')
        mocker.patch('scripts.create_root_channel_partner.settings.IS_PRIVATE_CLOUD', True)
        mocker.patch('scripts.create_root_channel_partner.settings.DEFAULT_HOST_NAME', self.other_host)
        with django_capture_on_commit_callbacks(execute=True):
            run('private', 'Private Root')

        root = ChannelPartner.objects.get(name='Private Root')
        assert root.cloud_host.hostname == self.other_host
        assert root.parent_channel_partner is None
        assert ChannelPartner.objects.count() == 1
        assert ChannelPartnerService.objects.count() == 9
        spy_ireg_get_default_host.assert_not_called()
        spy_irg_get_other_customizations.assert_not_called()

    def test_run_public_cloud_clean(self, mocker, django_capture_on_commit_callbacks):
        mocker.patch('scripts.create_root_channel_partner.IReg.__init__', return_value=None)
        mock_ireg_get_default_host = mocker.patch(
            'scripts.create_root_channel_partner.IReg.get_default_host', return_value=self.default_host)
        mock_irg_get_other_customizations = mocker.patch(
            'scripts.create_root_channel_partner.IReg.get_other_customizations', return_value=[('other', self.other_host)])

        with django_capture_on_commit_callbacks(execute=True):
            run('public')

        root = ChannelPartner.objects.get(parent_channel_partner__isnull=True)
        assert root.name == NX_NAME
        assert root.cloud_host.hostname == self.default_host
        assert ChannelPartner.objects.count() == 2
        assert ChannelPartnerService.objects.count() == 9 * 2
        assert root.services.count() == 9

        # TEST RUN ON EXISTING DATA
        with django_capture_on_commit_callbacks(execute=True):
            run('public')

        root = ChannelPartner.objects.get(parent_channel_partner__isnull=True)
        assert root.name == NX_NAME
        assert root.cloud_host.hostname == self.default_host
        assert ChannelPartner.objects.count() == 2
        assert ChannelPartnerService.objects.count() == 9 * 2
        assert root.services.count() == 9

    def test_run_public_cloud_with_root(self, mocker, django_capture_on_commit_callbacks, root_nx_channel_partner):
        root = ChannelPartner.objects.get(parent_channel_partner__isnull=True)
        assert root == root_nx_channel_partner
        mocker.patch('scripts.create_root_channel_partner.IReg.__init__', return_value=None)
        mock_ireg_get_default_host = mocker.patch(
            'scripts.create_root_channel_partner.IReg.get_default_host', return_value=self.default_host)
        mock_irg_get_other_customizations = mocker.patch(
            'scripts.create_root_channel_partner.IReg.get_other_customizations',
            return_value=[('other', self.other_host)])

        with django_capture_on_commit_callbacks(execute=True):
            run('public')

        root = ChannelPartner.objects.get(parent_channel_partner__isnull=True)
        assert root.name == NX_NAME
        assert root.cloud_host.hostname == self.default_host
        assert ChannelPartner.objects.count() == 2
        assert ChannelPartnerService.objects.count() == 9 * 2
        assert root.services.count() == 9
