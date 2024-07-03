import uuid
from collections import defaultdict
from typing import (
    Any,
    Dict,
    Iterable,
    List,
    Set,
    Union,
)

from django.core.exceptions import PermissionDenied
from django.db.models import (
    Prefetch,
    Q,
    QuerySet,
)

from partners.models import (
    ChannelPartner,
    ChannelPartnerStates,
    ChannelPartnerToUser,
    CloudUser,
    Organization,
)


class ChannelPartnerGroupStructureService:
    CACHE_TIMEOUT = 3600  # Cache timeout duration in seconds

    def process_descendants(self, channel_partner: ChannelPartner, user: CloudUser) -> List[Dict[str, Any]]:
        """
        Process and return the descendants of a given channel partner for a specific user.

        This method retrieves and structures the hierarchical data of a channel partner's descendants,
        including their organizations and sub-channels, ensuring that the user has the necessary permissions.

        Flow:
        1. Check if the user is a member of the given channel partner.
        2. If not, raise a PermissionDenied exception.
        3. Compute the descendants' data by calling the `_compute_descendants` method.
        4. Return the structured data of the descendants.

        Args:
            channel_partner (ChannelPartner): The root channel partner whose descendants are to be processed.
            user (CloudUser): The user requesting the descendant data.

        Returns:
            List[Dict[str, Any]]: A list of dictionaries representing the structured data of the descendants.

        Raises:
            PermissionDenied: If the user is not a member of the given channel partner.
        """
        if not channel_partner.is_member(user):
            raise PermissionDenied("Permission denied.")

        # TODO: Implement caching and clearing of cache in future
        computed_data = self._compute_descendants(channel_partner, user)
        return computed_data

    def process_full_structure(self, user: CloudUser) -> Dict[str, Any]:
        """
        Process and return the full structure of channel partners and organizations for a specific user.

        This method retrieves and structures the entire hierarchy of channel partners and organizations
        associated with the user, ensuring that the user has the necessary permissions.

        Flow:
        1. Retrieve all channel partners associated with the user by calling `_get_partners`.
        2. Retrieve all organizations associated with the user by calling `_get_organizations`.
        3. Build the full structure of channel partners and organizations by calling `_build_full_structure`.
        4. Return the structured data of the full hierarchy.

        Nuances:
        - The method ensures that only channel partners and organizations directly or indirectly associated with the user are included.
        - It handles multiple levels of nesting, ensuring that each channel partner's sub-channels and organizations are correctly nested.
        - If a channel partner does not have any sub-channels or organizations, it will still be included in the structure but with empty lists for these fields.
        - The method sorts the final list of channel partners alphabetically by name to ensure consistent ordering.

        Args:
            user (CloudUser): The user requesting the full structure data.

        Returns:
            Dict[str, Any]: A dictionary containing two keys:
                - 'channelPartners': A list of dictionaries representing the structured data of the channel partners.
                - 'organizations': A list of dictionaries representing the structured data of the organizations.

        Raises:
            PermissionDenied: If the user does not have the necessary permissions.
        """
        # TODO: Implement caching and clearing of cache in future
        computed_data = self._compute_full_structure(user)
        return computed_data

    def _compute_descendants(self, channel_partner: ChannelPartner, user: CloudUser, single_root: bool = True) -> List[
        Dict[str, Any]]:
        """
        Compute the descendants of a channel partner and return their structured data.
        """
        user_roles = self._get_user_roles(user)
        descendants = self._get_descendants(channel_partner)
        cp_mapping = {cp.id: self._prepare_descendant_channel_partner_data(cp) for cp in descendants}
        root_data = []

        for cp in descendants:
            parent_cp = cp.parent_channel_partner

            # Check if the channel partner or its parent is in the user's roles set
            if not (cp.id in user_roles or (parent_cp and parent_cp.id in user_roles)):
                continue

            orgs = [org for org in cp.organizations.all().order_by("name") if org.channel_partner_id in user_roles]
            cp_mapping[cp.id]['organizations'] = self._build_organization_data(orgs)

            if parent_cp and parent_cp.id in cp_mapping:
                cp_mapping[parent_cp.id]["subChannels"].append(cp_mapping[cp.id])
            elif single_root:
                if not root_data:
                    root_data.append(cp_mapping[cp.id])
            else:
                root_data.append(cp_mapping[cp.id])

        return root_data

    def _compute_full_structure(self, user: CloudUser) -> Dict[str, Any]:
        """
        Compute the full structure of channel partners and organizations for a specific user.

        This method builds a hierarchical structure of all channel partners and organizations
        associated with the user, ensuring that each level of the hierarchy is correctly nested.

        Flow:
        1. Retrieve all channel partners associated with the user by calling `_get_partners`.
        2. Retrieve all organizations associated with the user by calling `_get_organizations`.
        3. Initialize dictionaries to hold the computed data and the final structured data.
        4. Iterate through each channel partner and prepare its data using `_prepare_full_structure_channel_data`.
        5. For each channel partner, also prepare the data for its sub-channels.
        6. Maintain a mapping of parent-to-sub-channel relationships to ensure correct nesting.
        7. If a channel partner does not have a parent, add it to the top-level structured data.
        8. Sort the final list of channel partners alphabetically by name.
        9. Prepare the organization data for serialization.
        10. Return the structured data of the full hierarchy.

        Args:
            user (CloudUser): The user requesting the full structure data.

        Returns:
            Dict[str, Any]: A dictionary containing two keys:
                - 'channelPartners': A list of dictionaries representing the structured data of the channel partners.
                - 'organizations': A list of dictionaries representing the structured data of the organizations.
        """
        partners = self._get_partners(user)
        organizations = self._get_organizations(user)
        structured_data = self._build_full_structure(partners, organizations)

        return {
            'channelPartners': sorted(structured_data.values(), key=lambda x: x['name']),
            'organizations': [self._prepare_org_data(org) for org in organizations.values()]
        }

    def _get_partners(self, user: CloudUser) -> QuerySet[ChannelPartner]:
        """
        Retrieve all channel partners associated with the user.
        """
        return ChannelPartner.objects.filter(channelpartnertouser__user=user).prefetch_related(
            Prefetch('organizations', queryset=Organization.objects.all().order_by('name')),
            Prefetch('channel_partners', queryset=ChannelPartner.objects.all().order_by('name'))
        ).order_by('path__len', 'name')

    def _get_organizations(self, user: CloudUser) -> Dict[uuid.UUID, Organization]:
        """
        Retrieve all organizations associated with the user.
        """
        user_organizations = Organization.objects.filter(users=user).order_by('name')
        return {org.id: org for org in user_organizations}

    def _build_full_structure(
            self,
            partners: QuerySet[ChannelPartner],
            organizations: Dict[uuid.UUID, Organization]
    ) -> Dict[uuid.UUID, Dict[str, Any]]:
        """
        Build the full structure of channel partners and organizations.

        This method constructs a hierarchical structure of channel partners and organizations,
        ensuring that each level of the hierarchy is correctly nested and that only relevant
        items are included.

        Args:
            partners (QuerySet[ChannelPartner]): The channel partners associated with the user.
            organizations (Dict[uuid.UUID, Organization]): The organizations associated with the user.

        Returns:
            Dict[uuid.UUID, Dict[str, Any]]: A dictionary where the keys are channel partner IDs and the values
            are dictionaries representing the structured data of the channel partners.
        """
        computed_data = {}
        structured_data = {}
        parent_to_sub_channels = defaultdict(set)  # Dictionary to store sub-channel IDs for each parent

        for partner in partners:
            computed_data[partner.id] = self._prepare_full_structure_channel_data(
                partner,
                computed_data.get(partner.id, {}),
                organizations,
                include_organizations=True)

            for child in partner.channel_partners.all():
                computed_data[child.id] = self._prepare_full_structure_channel_data(
                    child,
                    {},
                    organizations,
                    include_organizations=False)
                computed_data[partner.id]['subChannels'].append(computed_data[child.id])

                # Update the parent-to-sub-channels mapping
                parent_to_sub_channels[partner.id].add(child.id)

            parent_id = partner.parent_channel_partner_id

            if parent_id not in computed_data:
                structured_data[partner.id] = computed_data[partner.id]
            else:
                # Use the pre-built set for faster lookup
                if partner.id not in parent_to_sub_channels.get(parent_id, set()):
                    computed_data[parent_id]['subChannels'].append(computed_data[partner.id])
                    parent_to_sub_channels.setdefault(parent_id, set()).add(partner.id)

        return structured_data

    def _prepare_org_data(self, org: Organization) -> Dict[str, Any]:
        """
        Prepare organization data for serialization.
        """
        return {
            'id': org.id,
            'name': org.name,
            'effectiveState': ChannelPartnerStates.STATE_NAMES[org.effective_state]
        }

    def _prepare_full_structure_channel_data(
            self,
            channel_partner: ChannelPartner,
            data: dict,
            organizations: Dict[uuid.UUID, Organization],
            include_organizations=True
    ) -> Dict[str, Any]:
        """
        Prepare channel partner data for the full structure.

        This method prepares the data for a channel partner, including its organizations and sub-channels,
        ensuring that the data is correctly nested and structured.

        Args:
            channel_partner (ChannelPartner): The channel partner whose data is to be prepared.
            data (dict): The existing data for the channel partner.
            organizations (Dict[uuid.UUID, Organization]): The organizations associated with the user.
            include_organizations (bool): Whether to include the organizations in the data.

        Returns:
            Dict[str, Any]: A dictionary representing the structured data of the channel partner.
        """
        data.update({
            'id': channel_partner.id,
            'name': channel_partner.name,
            'effectiveState': ChannelPartnerStates.STATE_NAMES[channel_partner.effective_state],
            'subChannels': data.get('subChannels', []),
            'organizations': data.get('organizations', [])
        })

        if include_organizations:
            for org in channel_partner.organizations.all():
                data['organizations'].append(self._prepare_org_data(org))
                organizations.pop(org.id, None)

        return data

    def _get_user_roles(self, user: CloudUser) -> Set[uuid.UUID]:
        """
        Helper method to get the set of user roles.
        """
        user_roles = (
            ChannelPartnerToUser.objects
            .filter(user=user)
            .values_list('channel_partner_id', flat=True)
        )
        return set(user_roles)

    def _prepare_descendant_channel_partner_data(
            self,
            channel_partner: ChannelPartner
    ) -> Dict[str, Any]:
        """
        Prepare descendant channel partner data for serialization.
        """
        return {
            'id': channel_partner.id,
            'name': channel_partner.name,
            'effectiveState': ChannelPartnerStates.STATE_NAMES[channel_partner.effective_state],
            'subChannels': [],
            'organizations': []
        }

    def _build_organization_data(self, orgs: Iterable[Organization]) -> List[Dict[str, Any]]:
        """
        Build organization data for serialization.
        """
        return [
            {
                'id': org.id,
                'name': org.name,
                'effectiveState': ChannelPartnerStates.STATE_NAMES[org.effective_state]}
            for org in orgs]

    def _get_descendants(
            self,
            channel_partner: Union[ChannelPartner, QuerySet[ChannelPartner]]
    ) -> List[ChannelPartner]:
        """
        Retrieve all descendants of a given channel partner.
        """
        descendants = ChannelPartner.objects.filter(
            Q(path__contains=[channel_partner.id]) |
            Q(id=channel_partner.id)).order_by('path__len', 'name')
        descendants = descendants.prefetch_related(
            Prefetch('organizations', queryset=Organization.objects
                     .filter(organizationtouser__system_group__isnull=True)
                     .order_by('name')))
        return list(descendants)
