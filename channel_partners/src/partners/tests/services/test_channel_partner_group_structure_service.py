import pytest

from partners.services.channel_partner_group_structure_service import (
    ChannelPartnerGroupStructureService,
)


class TestChannelPartnerGroupStructureService:

    @pytest.fixture(autouse=True)
    def setUp(self, cloud_test_host, channel_partner_factory, organization_factory, cp_user_factory):
        self.host = cloud_test_host
        """
                root_nx_channel_partner (Hidden Root)
                │
                └── cp_parent [cp_parent_user]
                    │
                    ├── cp_parent_org_1
                    ├── cp_parent_org_2
                    │
                    ├── cp (Child of cp_parent) [cp_user]
                    │   ├── cp_org_1
                    │   └── cp_org_2
                    │
                    └── cp_other (Child of cp_parent) [cp_other_user]
                        ├── cp_other_org_1
                        ├── cp_other_org_2
                        │
                        └── cp_other_child (Child of cp_other) [cp_other_child_user]
                            ├── cp_other_child_org_1
                            └── cp_other_child_org_2
                """
        # Parent CP Stuff
        self.cp_parent = channel_partner_factory(
            name='cp_parent',
            cloud_host=self.host)
        self.cp_parent_user = cp_user_factory(
            channel_partner=self.cp_parent)

        self.cp_parent_org_1 = organization_factory(
            channel_partner=self.cp_parent,
            name='cp_parent_org_1')

        self.cp_parent_org_2 = organization_factory(
            channel_partner=self.cp_parent,
            name='cp_parent_org_2')

        # CP Stuff
        self.cp = channel_partner_factory(
            parent_channel_partner=self.cp_parent,
            name="cp",
            cloud_host=self.host)
        self.cp_user = cp_user_factory(
            channel_partner=self.cp)

        self.cp_org_1 = organization_factory(
            channel_partner=self.cp,
            name="cp_org_1")

        self.cp_org_2 = organization_factory(
            channel_partner=self.cp,
            name="cp_org_2")

        # Other CP (Same level) Stuff
        self.cp_other = channel_partner_factory(
            parent_channel_partner=self.cp_parent,
            name="cp_other",
            cloud_host=self.host)
        self.cp_other_user = cp_user_factory(
            channel_partner=self.cp_other)

        self.cp_other_org_1 = organization_factory(
            channel_partner=self.cp_other,
            name="cp_other_org_1")

        self.cp_other_org_2 = organization_factory(
            channel_partner=self.cp_other,
            name="cp_other_org_2")

        # Child of "Other CP" Stuff
        self.cp_other_child = channel_partner_factory(
            parent_channel_partner=self.cp_other,
            name="cp_other_child",
            cloud_host=self.host)
        self.cp_other_child_user = cp_user_factory(
            channel_partner=self.cp_other_child)

        self.cp_other_child_org_1 = organization_factory(
            channel_partner=self.cp_other_child,
            name="cp_other_child_org_1")

        self.cp_other_child_org_2 = organization_factory(
            channel_partner=self.cp_other_child,
            name="cp_other_child_org_2")

    def test_channel_partner_group_structure_other_cp_child(self):
        service = ChannelPartnerGroupStructureService()
        actual = service.process(self.cp_other_child, self.cp_other_child_user.user)

        assert len(actual) == 1
        assert actual[0]["name"] == "cp_other_child"

        assert len(actual[0]["organizations"]) == 2
        assert actual[0]["organizations"][0]["name"] == "cp_other_child_org_1"
        assert actual[0]["organizations"][1]["name"] == "cp_other_child_org_2"

    def test_channel_partner_group_structure_other_cp(self):
        service = ChannelPartnerGroupStructureService()
        actual = service.process(self.cp_other, self.cp_other_user.user)

        assert len(actual) == 1

        cp_other_actual = actual[0]
        assert cp_other_actual is not None

        assert len(cp_other_actual["organizations"]) == 2
        assert cp_other_actual["organizations"][0]["name"] == "cp_other_org_1"
        assert cp_other_actual["organizations"][1]["name"] == "cp_other_org_2"

        assert len(cp_other_actual["subChannels"]) == 1
        cp_other_child = cp_other_actual["subChannels"][0]
        assert cp_other_child["name"] == "cp_other_child"

        assert len(cp_other_child["organizations"]) == 0


    def test_channel_partner_group_structure_cp(self):
        service = ChannelPartnerGroupStructureService()
        actual = service.process(self.cp, self.cp_user.user)

        assert len(actual) == 1

        cp_actual = next((item for item in actual if item["name"] == "cp"), None)
        assert cp_actual is not None

        assert len(cp_actual["organizations"]) == 2
        assert cp_actual["organizations"][0]["name"] == "cp_org_1"
        assert cp_actual["organizations"][1]["name"] == "cp_org_2"

        assert "subChannels" in cp_actual
        assert len(cp_actual["subChannels"]) == 0

    def test_channel_partner_group_structure_cp_parent(self):
        service = ChannelPartnerGroupStructureService()
        actual = service.process(self.cp_parent, self.cp_parent_user.user)

        assert len(actual) == 1
        assert len(actual[0].get("subChannels")) == 2
        assert len(actual[0].get("subChannels")[0].get("subChannels")) == 0
        assert len(actual[0].get("subChannels")[1].get("subChannels")) == 0
