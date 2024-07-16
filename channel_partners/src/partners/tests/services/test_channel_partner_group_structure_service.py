import pytest

from partners.models import OrganizationToUser
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
        actual = service.process_descendants(self.cp_other_child, self.cp_other_child_user.user)

        assert len(actual) == 1
        assert actual[0]["name"] == "cp_other_child"

        assert len(actual[0]["organizations"]) == 2
        assert actual[0]["organizations"][0]["name"] == "cp_other_child_org_1"
        assert actual[0]["organizations"][1]["name"] == "cp_other_child_org_2"

    def test_channel_partner_group_structure_other_cp(self):
        service = ChannelPartnerGroupStructureService()
        actual = service.process_descendants(self.cp_other, self.cp_other_user.user)

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
        actual = service.process_descendants(self.cp, self.cp_user.user)

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
        actual = service.process_descendants(self.cp_parent, self.cp_parent_user.user)

        assert len(actual) == 1
        assert len(actual[0].get("subChannels")) == 2
        assert len(actual[0].get("subChannels")[0].get("subChannels")) == 0
        assert len(actual[0].get("subChannels")[1].get("subChannels")) == 0

    def test_deep_nested_structure_with_multi_cp_user(
            self,
            multi_cp_user_factory,
            channel_partner_factory,
            organization_factory):
        """
            root_cp
            ├── root_cp_org [multi_cp_user]
            |
            └── cp_level_1
                │
                ├── org_level_1_1
                ├── org_level_1_2
                │
                └── cp_level_2 [multi_cp_user]
                │   ├── org_level_2_1
                │   └── org_level_2_2
                │       ...
                │           └── cp_level_18
                │               ├── org_level_18_1
                │               ├── org_level_18_2
                │               └── cp_level_19 [multi_cp_user]
                │                   ├── org_level_19_1
                │                   └── org_level_19_2
                │                       └── cp_level_20
                │                           ├── org_level_20_1
                │                           └── org_level_20_2
            """
        # Create a root channel partner
        root_cp = channel_partner_factory(name='root_cp', cloud_host=self.host)

        # List to hold specific channel partners for multi_cp_user
        cp_for_multi_user = []

        # Create a nested structure 20 layers deep
        current_parent = root_cp
        for i in range(1, 21):
            cp = channel_partner_factory(
                parent_channel_partner=current_parent,
                name=f"cp_level_{i}",
                cloud_host=self.host)
            organization_factory(channel_partner=cp, name=f"org_level_{i}_1")
            if i == 2 or i == 19:  # Identify channel partners for multi_cp_user
                cp_for_multi_user.append(cp)
            current_parent = cp

        # Create multi_cp_user associated with the 2nd and 19th level channel partners
        user, multi_cp_user_links = multi_cp_user_factory(channel_partners=cp_for_multi_user)

        # Add user to an organization that's not related
        user_org = OrganizationToUser.objects.create(
            user=user,
            organization=organization_factory(channel_partner=root_cp, name="root_cp_org"))
        user_org.save()

        # Use the final_cp and multi_cp_user for making a request and asserting the structure
        service = ChannelPartnerGroupStructureService()
        actual = service.process_full_structure(user)

        actual_channel_partners = actual.get("channelPartners")
        actual_organizations = actual.get("organizations")

        assert len(actual_channel_partners) == 2

        assert actual_channel_partners[0]["name"] == "cp_level_19"
        assert actual_channel_partners[0]["subChannels"][0]["name"] == "cp_level_20"

        assert actual_channel_partners[1]["name"] == "cp_level_2"
        assert actual_channel_partners[1]["subChannels"][0]["name"] == "cp_level_3"

        assert len(actual_organizations) == 1
        assert actual_organizations[0]["name"] == "root_cp_org"

    def test_channel_structure_ordering(self, multi_cp_user_factory, channel_partner_factory, organization_factory):
        # Create a root channel partner
        root_cp = channel_partner_factory(name='root_cp', cloud_host=self.host)

        # Create a random channel partner with root_cp as parent
        rando_cp = channel_partner_factory(parent_channel_partner=root_cp, name="rando_cp", cloud_host=self.host)

        # Create a second level channel partner with rando_cp as parent
        cp2 = channel_partner_factory(parent_channel_partner=rando_cp, name="a_cp_level_2_1", cloud_host=self.host)

        # Create a first level channel partner with root_cp as parent and add organizations to it
        cp1 = channel_partner_factory(parent_channel_partner=root_cp, name="b_cp_level_1_1", cloud_host=self.host)
        organization_factory(channel_partner=cp1, name="org_level_1_1")
        organization_factory(channel_partner=cp1, name="org_level_1_2")

        # Change the parent of cp2 to cp1 and add organizations to it
        cp2.parent_channel_partner = cp1
        cp2.save()
        organization_factory(channel_partner=cp2, name="org_level_2_1")
        organization_factory(channel_partner=cp2, name="org_level_2_2")

        # Save cp1 after making changes
        cp1.save()

        # Create a user associated with cp2 and cp1
        user, multi_cp_user_links = multi_cp_user_factory(channel_partners=[cp2, cp1])

        # Add user to an organization that's not related
        user_org = OrganizationToUser.objects.create(
            user=user,
            organization=organization_factory(channel_partner=root_cp, name="root_cp_org"))
        user_org.save()

        # Process the full structure for the user
        service = ChannelPartnerGroupStructureService()
        actual = service.process_full_structure(user)

        # Get the actual channel partners and organizations
        actual_channel_partners = actual.get("channelPartners")
        actual_organizations = actual.get("organizations")

        # Assert that there is only one channel partner
        assert len(actual_channel_partners) == 1

    def test_channel_structure_one_level_deeper(self, multi_cp_user_factory, channel_partner_factory,
                                                organization_factory):
        # Create a root channel partner
        root_cp = channel_partner_factory(name='root_cp', cloud_host=self.host)

        # Create a random channel partner with root_cp as parent
        rando_cp = channel_partner_factory(parent_channel_partner=root_cp, name="rando_cp", cloud_host=self.host)

        # Create an intermediate channel partner with rando_cp as parent
        inter_cp = channel_partner_factory(parent_channel_partner=root_cp, name="inter_cp", cloud_host=self.host)

        # Create a second level channel partner with inter_cp as parent
        cp2 = channel_partner_factory(parent_channel_partner=inter_cp, name="a_cp_level_2_1", cloud_host=self.host)
        organization_factory(channel_partner=cp2, name="org_level_2_1")
        organization_factory(channel_partner=cp2, name="org_level_2_2")

        # Create a first level channel partner with inter_cp as parent and add organizations to it
        cp1 = channel_partner_factory(parent_channel_partner=inter_cp, name="b_cp_level_1_1", cloud_host=self.host)
        organization_factory(channel_partner=cp1, name="org_level_1_1")
        organization_factory(channel_partner=cp1, name="org_level_1_2")

        cp2.save()
        # Create a user associated with cp2 and cp1
        user, multi_cp_user_links = multi_cp_user_factory(channel_partners=[cp2, cp1])

        # Add user to an organization that's not related
        user_org = OrganizationToUser.objects.create(
            user=user,
            organization=organization_factory(channel_partner=root_cp, name="root_cp_org"))
        user_org.save()

        # Process the full structure for the user
        service = ChannelPartnerGroupStructureService()
        actual = service.process_full_structure(user)

        # Get the actual channel partners and organizations
        actual_channel_partners = actual.get("channelPartners")
        actual_organizations = actual.get("organizations")

        # Assert that there are two channel partners
        assert len(actual_channel_partners) == 2
        assert len(actual_organizations) == 1

    def test_custom_channel_partner_group_structure(self, channel_partner_factory, organization_factory,
                                                    cp_user_factory):

        top_cp = channel_partner_factory(name='TOP CP', cloud_host=self.host)
        user = cp_user_factory(channel_partner=top_cp)

        cp1 = channel_partner_factory(parent_channel_partner=top_cp, name='CP 1', cloud_host=self.host)
        cp2 = channel_partner_factory(parent_channel_partner=cp1, name='CP 2', cloud_host=self.host)

        cp3 = channel_partner_factory(parent_channel_partner=cp2, name='CP 3', cloud_host=self.host)
        cp_user_factory(email=user.user.email, channel_partner=cp3)
        cp3_1 = channel_partner_factory(parent_channel_partner=cp3, name='CP 3-1', cloud_host=self.host)

        cp4 = channel_partner_factory(parent_channel_partner=cp3, name='CP 4', cloud_host=self.host)
        cp4_1 = channel_partner_factory(parent_channel_partner=cp4, name='CP 4-1', cloud_host=self.host)

        cp5 = channel_partner_factory(parent_channel_partner=cp4, name='CP 5', cloud_host=self.host)
        cp_user_factory(email=user.user.email, channel_partner=cp5)
        cp5_1 = channel_partner_factory(parent_channel_partner=cp5, name='CP 5-1', cloud_host=self.host)
        cp_user_factory(email=user.user.email, channel_partner=cp5_1)
        cp5_1_1 = channel_partner_factory(parent_channel_partner=cp5_1, name='CP 5-1-1', cloud_host=self.host)

        cp6 = channel_partner_factory(parent_channel_partner=cp5, name='CP 6', cloud_host=self.host)
        cp6_1 = channel_partner_factory(parent_channel_partner=cp6, name='CP 6-1', cloud_host=self.host)

        cp7 = channel_partner_factory(parent_channel_partner=cp6, name='CP 7', cloud_host=self.host)

        organization_factory(channel_partner=cp1, name='Organization 1')
        organization_factory(channel_partner=cp2, name='Organization 2')
        organization_factory(channel_partner=cp3, name='Organization 3')
        organization_factory(channel_partner=cp4, name='Organization 4')
        organization_factory(channel_partner=cp5, name='Organization 5')
        organization_factory(channel_partner=cp5_1, name='Organization 5-1')
        organization_factory(channel_partner=cp6, name='Organization 6')

        service = ChannelPartnerGroupStructureService()
        actual_kevin = service.process_full_structure(user.user)
        # actual_kyrylo = service.full_structure(user.user)

        actual = actual_kevin
        actual_channel_partners = actual.get("channelPartners")
        actual_organizations = actual.get("organizations")

        # Assertions for the top-level channel partners
        assert len(actual_channel_partners) == 2

        # Assertions for CP 3
        cp3_actual = next(cp for cp in actual_channel_partners if cp["name"] == "CP 3")
        assert cp3_actual["name"] == "CP 3"
        assert len(cp3_actual["organizations"]) == 1
        assert cp3_actual["organizations"][0]["name"] == "Organization 3"

        # Assertions for CP 3-1
        cp3_1_actual = next(cp for cp in cp3_actual["subChannels"] if cp["name"] == "CP 3-1")
        assert cp3_1_actual["name"] == "CP 3-1"
        assert len(cp3_1_actual["organizations"]) == 0

        # Assertions for CP 4
        cp4_actual = next(cp for cp in cp3_actual["subChannels"] if cp["name"] == "CP 4")
        assert cp4_actual["name"] == "CP 4"
        assert len(cp4_actual["organizations"]) == 0

        # Assertions for CP 5
        cp5_actual = next(cp for cp in cp4_actual["subChannels"] if cp["name"] == "CP 5")
        assert cp5_actual["name"] == "CP 5"
        assert len(cp5_actual["organizations"]) == 1
        assert cp5_actual["organizations"][0]["name"] == "Organization 5"

        # Assertions for CP 5-1
        cp5_1_actual = next(cp for cp in cp5_actual["subChannels"] if cp["name"] == "CP 5-1")
        assert cp5_1_actual["name"] == "CP 5-1"
        assert len(cp5_1_actual["organizations"]) == 1

        # Assertions for CP 5-1-1
        cp5_1_1_actual = next(cp for cp in cp5_1_actual["subChannels"] if cp["name"] == "CP 5-1-1")
        assert cp5_1_1_actual["name"] == "CP 5-1-1"
        assert len(cp5_1_1_actual["organizations"]) == 0

        # Assertions for CP 6
        cp6_actual = next(cp for cp in cp5_actual["subChannels"] if cp["name"] == "CP 6")
        assert cp6_actual["name"] == "CP 6"
        assert len(cp6_actual["organizations"]) == 0

        # Assertions for TOP CP
        top_cp_actual = next(cp for cp in actual_channel_partners if cp["name"] == "TOP CP")
        assert top_cp_actual["name"] == "TOP CP"
        assert len(top_cp_actual["organizations"]) == 0

        # Assertions for CP 1 under TOP CP
        cp1_actual = next(cp for cp in top_cp_actual["subChannels"] if cp["name"] == "CP 1")
        assert cp1_actual["name"] == "CP 1"
        assert len(cp1_actual["organizations"]) == 0

        # Assertions for organizations at the top level
        assert len(actual_organizations) == 0


    def test_user_org_in_sub_cp_without_roles(self, cloud_user_factory, cp_user_factory, org_user_factory):
        user = cloud_user_factory()
        cp_user_factory(email=user.email, channel_partner=self.cp_parent)
        org_user_factory(email=user.email, organization=self.cp_org_1)
        service = ChannelPartnerGroupStructureService()
        struct = service.process_full_structure(user)
        assert len(struct['organizations']) == 0
        assert len(struct['channelPartners']) == 1
        assert struct['channelPartners'][0]['name'] == 'cp_parent'
        assert len(struct['channelPartners'][0]['organizations']) == 2
        cp = next(filter(lambda cp: cp['name'] == 'cp', struct['channelPartners'][0]['subChannels']))
        assert len(cp['organizations']) == 1
        assert cp['organizations'][0]['name'] == 'cp_org_1'